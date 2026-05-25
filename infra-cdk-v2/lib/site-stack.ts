import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// lambda.json schema
// Each lambdas/<name>/lambda.json file must conform to this shape.
// ─────────────────────────────────────────────────────────────────────────────
interface LambdaEnvVar {
  // Either a literal string value...
  value?: string;
  // ...or a reference to a stack output (resolved at synth time)
  fromStack?: "bucketName" | "region" | "userPoolId" | "userPoolClientId" | "apiUrl" | "cdnUrl" | "dynamoTableName" | "dynamoTableArn";
}

interface LambdaS3Access {
  // S3 prefix (without trailing slash) → allowed actions
  // Actions: "get" | "put" | "delete" | "list"
  [prefix: string]: Array<"get" | "put" | "delete" | "list">;
}

interface LambdaApiGateway {
  path: string; // mounted at /api/<path>/{proxy+}
  methods: string[];
  cognitoAuthorizer: boolean;
}

interface LambdaConfig {
  description?: string;
  architecture: "arm64" | "x86_64";
  runtime: string;
  timeoutSeconds?: number;
  memoryMB?: number;
  envVars?: Record<string, LambdaEnvVar | string>;
  s3Access?: LambdaS3Access;
  apiGateway?: LambdaApiGateway;
  /**
   * DynamoDB access on the shared ABC-Main-Table.
   * Actions: "get" | "put" | "update" | "delete" | "query" | "scan"
   */
  dynamoAccess?: Array<"get" | "put" | "update" | "delete" | "query" | "scan">;
  /**
   * When true, grants this Lambda permission to call GetFunctionConfiguration
   * and UpdateFunctionConfiguration on itself. Used by abc_software_licensor_dispatcher
   * to persist state in its own env vars.
   */
  selfUpdateConfig?: boolean;
  /**
   * When true, grants this Lambda s3:GeneratePresignedUrl equivalent:
   * s3:PutObject on all bucket paths (presigned URLs are signed with the
   * Lambda's credentials, so the role needs PutObject on the target paths).
   * Specify which folders via s3Access as usual.
   */
  presign?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stack props
// ─────────────────────────────────────────────────────────────────────────────
export interface SiteStackProps extends cdk.StackProps {
  appName: string;
  /**
   * The domain the site is actually served at.
   * Can be a subdomain: "dev.alteredbrainchemistry.com"
   * Or the root domain: "alteredbrainchemistry.com"
   */
  siteDomain: string;
  /**
   * The root domain that has a hosted zone in Route 53.
   * If siteDomain is "dev.alteredbrainchemistry.com", this is "alteredbrainchemistry.com".
   * If siteDomain is "alteredbrainchemistry.com", this is also "alteredbrainchemistry.com".
   * CDK uses this to find the hosted zone for DNS/cert validation.
   */
  hostedZoneDomain: string;
  /**
   * When true, Amplify maps root + www of hostedZoneDomain.
   * When false (subdomain mode), Amplify maps only siteDomain.
   * Defaults to false when siteDomain !== hostedZoneDomain.
   */
  mapRootAndWww?: boolean;
  githubRepo: string;
  githubBranch?: string;
  githubTokenSsmPath: string;
  /**
   * The resolved GitHub token value, read from SSM at synth time by bin/infra.ts.
   * Passed as a CloudFormation NoEcho parameter so it never appears in logs.
   */
  githubTokenValue: string;
  /**
   * Absolute path to the lambdas/ directory.
   * Each subdirectory must contain a lambda.json and a builds/ folder
   * with at least one .zip file (the latest by filename sort is used).
   */
  lambdasDir: string;
  /**
   * ARN of the Amplify Console backend IAM role.
   * Leave unset on first deploy — Amplify creates this role when it first builds.
   * After the first build, find the role in IAM (search "amplifyconsole-backend-role"),
   * then redeploy with --context amplifyBuildRoleArn=arn:aws:iam::ACCOUNT:role/ROLE_NAME
   * so the S3 bucket policy grants it read access to content/.
   */
  amplifyBuildRoleArn?: string;
  /**
   * Subdomain prefix for the CloudFront CDN distribution.
   * e.g. "hephaestus" → hephaestus.alteredbrainchemistry.com
   * Defaults to "cdn" if not specified.
   */
  cdnSubdomain?: string;
  frontendEnvVars?: Record<string, string>;
}

export class SiteStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly api: apigateway.RestApi;
  public readonly userPool: cognito.UserPool;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const { appName } = props;
    const siteDomain = props.siteDomain;
    const hostedZoneDomain = props.hostedZoneDomain;
    const isSubdomain = siteDomain !== hostedZoneDomain;
    // The subdomain label to put in front of the hosted zone for the CDN.
    // cdnDomain is always anchored to hostedZoneDomain so the Route 53 record
    // can be created in the hosted zone regardless of subdomain/root mode.
    const cdnSubdomain = props.cdnSubdomain ?? "cdn";
    // Full CDN hostname, e.g. hephaestus.alteredbrainchemistry.com
    // In subdomain mode siteDomain is dev.alteredbrainchemistry.com so we
    // build off hostedZoneDomain so the record sits in the right hosted zone.
    const cdnDomain = `${cdnSubdomain}.${hostedZoneDomain}`;
    const mapRootAndWww = props.mapRootAndWww ?? !isSubdomain;
    const branch = props.githubBranch ?? "main";

    // ── 1. COGNITO ────────────────────────────────────────────────────────────
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${appName}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        newsletterOptIn: new cognito.BooleanAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "admin",
      description: "Site administrators",
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false,
    });

    // ── 2. S3 ─────────────────────────────────────────────────────────────────
    this.bucket = new s3.Bucket(this, "ContentBucket", {
      bucketName: `${appName}-frontend-bucket`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: [`https://${siteDomain}`, `https://www.${siteDomain}`],
          allowedHeaders: ["*"],
        },
      ],
    });

    // ── 3. CLOUDFRONT ─────────────────────────────────────────────────────────
    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", { domainName: hostedZoneDomain });

    const cdnCert = new acm.Certificate(this, "CdnCert", {
      domainName: cdnDomain,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
    // CloudFront requires certificates in us-east-1. When deploying from another
    // region, wrap this stack in a cross-region reference or deploy to us-east-1.
    // If your default region is already us-east-1 this works as-is.

    const oac = new cloudfront.S3OriginAccessControl(this, "OAC", {
      description: `OAC for ${appName}`,
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
      originAccessControl: oac,
    });

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `${appName} CDN`,
      domainNames: [cdnDomain],
      certificate: cdnCert,
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      additionalBehaviors: {
        "/thumbs/*":    { origin: s3Origin, viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED },
        "/images/*":    { origin: s3Origin, viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED },
        "/downloads/*": { origin: s3Origin, viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED },
        "/media/*":     { origin: s3Origin, viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED },
      },
    });

    // CloudFront OAC bucket policy
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: "AllowCloudFrontOAC",
      principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
      actions: ["s3:GetObject"],
      resources: [this.bucket.arnForObjects("*")],
      conditions: {
        ArnLike: {
          "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
        },
      },
    }));

    // Amplify build role access — only added once the role ARN is known.
    // On first deploy leave amplifyBuildRoleArn empty; after Amplify creates
    // its backend role, pass it via --context amplifyBuildRoleArn=arn:aws:iam::...
    // and redeploy. The bucket policy statements are skipped entirely when empty
    // so S3 never receives an invalid blank principal.
    const amplifyRoleArn = props.amplifyBuildRoleArn ?? "";
    if (amplifyRoleArn) {
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: "AllowAmplifyBuildListContent",
        principals: [new iam.ArnPrincipal(amplifyRoleArn)],
        actions: ["s3:ListBucket"],
        resources: [this.bucket.bucketArn],
        conditions: { StringLike: { "s3:prefix": "content/*" } },
      }));
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        sid: "AllowAmplifyBuildGetContent",
        principals: [new iam.ArnPrincipal(amplifyRoleArn)],
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("content/*")],
      }));
    }

    // ── 3b. SEED INITIAL CONTENT FILES ───────────────────────────────────────
    // Writes content/*.json files with [] as the initial value.
    // Uses BucketDeployment which is idempotent by default — it will NOT
    // overwrite a file that already exists if you set prune: false.
    // To reset a file to [] manually: aws s3 rm s3://BUCKET/content/FILE.json
    const seedDir = path.join(__dirname, "..", "seed-content");
    if (fs.existsSync(seedDir)) {
      new s3deploy.BucketDeployment(this, "SeedContent", {
        sources: [s3deploy.Source.asset(seedDir)],
        destinationBucket: this.bucket,
        destinationKeyPrefix: "content",
        // prune: false means files already in the bucket are left alone.
        // New files in seedDir are uploaded only if they don't exist yet.
        prune: false,
        retainOnDelete: true,
      });
    }

    // ── 4. DYNAMODB ──────────────────────────────────────────────────────────
    // Single shared table used across lambda functions.
    // PAY_PER_REQUEST is ideal for a low-traffic table with unpredictable access.
    const mainTable = new dynamodb.Table(this, "MainTable", {
      tableName: "ABC-Main-Table",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // RETAIN means a `cdk destroy` will NOT delete the table or its data.
      // Change to DESTROY only in a dev environment where data loss is acceptable.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // ── 5. API GATEWAY ────────────────────────────────────────────────────────
    this.api = new apigateway.RestApi(this, "Api", {
      restApiName: `${appName}-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: [
          `https://${siteDomain}`,
          ...(mapRootAndWww ? [`https://www.${siteDomain}`] : []),
          "http://localhost:3000",
          "http://localhost:3001",
        ],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
      deployOptions: {
        stageName: "v1",
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "CognitoAuth", {
      cognitoUserPools: [this.userPool],
      identitySource: "method.request.header.Authorization",
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    const apiResource = this.api.root.addResource("api");

    // ── 6. LAMBDA AUTO-DISCOVERY ──────────────────────────────────────────────
    // Resolve all stack values that lambda.json can reference via "fromStack"
    const stackRefs: Record<string, string> = {
      bucketName: this.bucket.bucketName,
      region: this.region,
      userPoolId: this.userPool.userPoolId,
      userPoolClientId: userPoolClient.userPoolClientId,
      apiUrl: this.api.url,
      cdnUrl: `https://${cdnDomain}`,
      dynamoTableName: mainTable.tableName,
      dynamoTableArn: mainTable.tableArn,
    };

    const lambdasDir = props.lambdasDir;
    if (fs.existsSync(lambdasDir)) {
      const lambdaNames = fs
        .readdirSync(lambdasDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const fnName of lambdaNames) {
        this.addLambda(fnName, lambdasDir, appName, stackRefs, cognitoAuthorizer, apiResource, mainTable);
      }
    }

    // ── 7. AMPLIFY ────────────────────────────────────────────────────────────
    // Token was read from SSM in bin/infra.ts at synth time.
    // We wrap it in SecretValue so CDK/CFn treats it as sensitive
    // and marks it NoEcho in the template.
    const githubToken = cdk.SecretValue.unsafePlainText(props.githubTokenValue);
    const amplifyApp = new amplify.App(this, "AmplifyApp", {
      appName: `${appName}-frontend`,
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: props.githubRepo.split("/")[0],
        repository: props.githubRepo.split("/")[1],
        oauthToken: githubToken,
      }),
      platform: amplify.Platform.WEB_COMPUTE,
      environmentVariables: {
        NEXT_PUBLIC_API_BASE_URL: this.api.url,
        NEXT_PUBLIC_SITE_URL: `https://${siteDomain}`,
        NEXT_PUBLIC_CDN_URL: `https://${cdnDomain}`,
        NEXT_PUBLIC_USER_POOL_ID: this.userPool.userPoolId,
        NEXT_PUBLIC_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        S3_BUCKET_NAME: this.bucket.bucketName,
        REGION: this.region,
        ...props.frontendEnvVars,
        _LIVE_UPDATES: JSON.stringify([
          { name: "Next.js version", pkg: "next-version", type: "internal", version: "latest" },
        ]),
      },
    });

    const mainBranch = amplifyApp.addBranch(branch, { autoBuild: true, stage: "PRODUCTION" });

    if (mapRootAndWww) {
      // Root domain mode: map @ and www.domain.com → Amplify
      const amplifyDomain = amplifyApp.addDomain(hostedZoneDomain, { enableAutoSubdomain: false });
      amplifyDomain.mapRoot(mainBranch);
      amplifyDomain.mapSubDomain(mainBranch, "www");
    } else {
      // Subdomain mode: map only the specific subdomain (e.g. dev.alteredbrainchemistry.com)
      // The subdomain prefix is everything before the first dot of hostedZoneDomain
      const subdomainPrefix = siteDomain.replace(`.${hostedZoneDomain}`, "");
      const amplifyDomain = amplifyApp.addDomain(hostedZoneDomain, { enableAutoSubdomain: false });
      amplifyDomain.mapSubDomain(mainBranch, subdomainPrefix);
    }

    // ── 8. DNS ────────────────────────────────────────────────────────────────
    // CDN record: cdn.dev.alteredbrainchemistry.com (subdomain mode)
    //              or cdn.alteredbrainchemistry.com (root mode)
    // recordName is relative to the hosted zone root, so strip hostedZoneDomain suffix
    const cdnRecordName = cdnDomain.replace(`.${hostedZoneDomain}`, "");
    new route53.ARecord(this, "CdnRecord", {
      zone: hostedZone,
      recordName: cdnRecordName,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(this.distribution)
      ),
    });

    // ── 9. OUTPUTS ────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "BucketName",         { value: this.bucket.bucketName,              exportName: `${appName}-bucket-name` });
    new cdk.CfnOutput(this, "DistributionId",     { value: this.distribution.distributionId,    exportName: `${appName}-cf-distribution-id` });
    new cdk.CfnOutput(this, "CdnUrl",             { value: `https://${cdnDomain}`,              exportName: `${appName}-cdn-url` });
    new cdk.CfnOutput(this, "ApiUrl",             { value: this.api.url,                        exportName: `${appName}-api-url` });
    new cdk.CfnOutput(this, "UserPoolId",         { value: this.userPool.userPoolId,            exportName: `${appName}-user-pool-id` });
    new cdk.CfnOutput(this, "UserPoolClientId",   { value: userPoolClient.userPoolClientId,     exportName: `${appName}-user-pool-client-id` });
    new cdk.CfnOutput(this, "AmplifyAppId",       { value: amplifyApp.appId,                    exportName: `${appName}-amplify-app-id` });
    new cdk.CfnOutput(this, "DynamoTableName",    { value: mainTable.tableName,                  exportName: `${appName}-dynamo-table-name` });
    new cdk.CfnOutput(this, "DynamoTableArn",     { value: mainTable.tableArn,                   exportName: `${appName}-dynamo-table-arn` });
  }

  // ── Lambda factory ─────────────────────────────────────────────────────────

  /** Strip underscores for use in IAM sids and CloudFormation export names. */
  private sanitize(s: string): string {
    return s.replace(/_/g, "");
  }

  /** Replace underscores with hyphens for use in resource/export names. */
  private kebab(s: string): string {
    return s.replace(/_/g, "-");
  }

  private addLambda(
    fnName: string,
    lambdasDir: string,
    appName: string,
    stackRefs: Record<string, string>,
    cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer,
    apiRoot: apigateway.Resource,
    mainTable: dynamodb.Table
  ) {
    const fnDir = path.join(lambdasDir, fnName);
    const configPath = path.join(fnDir, "lambda.json");

    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️  Skipping ${fnName}: no lambda.json found`);
      return;
    }

    const config: LambdaConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Find the latest build zip
    const buildsDir = path.join(fnDir, "builds");
    if (!fs.existsSync(buildsDir)) {
      console.warn(`⚠️  Skipping ${fnName}: no builds/ directory`);
      return;
    }
    const zips = fs.readdirSync(buildsDir).filter((f) => f.endsWith(".zip")).sort();
    if (zips.length === 0) {
      console.warn(`⚠️  Skipping ${fnName}: no .zip files in builds/`);
      return;
    }
    const latestZip = path.join(buildsDir, zips[zips.length - 1]);

    // ── IAM role for this lambda ──────────────────────────────────────────
    const role = new iam.Role(this, `${fnName}Role`, {
      roleName: `${appName}-${this.kebab(fnName)}-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    // Grant S3 access as declared in lambda.json s3Access
    if (config.s3Access) {
      const actionMap: Record<string, string> = {
        get: "s3:GetObject",
        put: "s3:PutObject",
        delete: "s3:DeleteObject",
        list: "s3:ListBucket",
      };

      for (const [prefix, actions] of Object.entries(config.s3Access)) {
        const s3Actions = actions
          .filter((a) => a !== "list")
          .map((a) => actionMap[a]);

        if (s3Actions.length > 0) {
          role.addToPolicy(new iam.PolicyStatement({
            sid: `${this.sanitize(fnName)}S3${this.sanitize(prefix)}Objects`,
            actions: s3Actions,
            resources: [this.bucket.arnForObjects(`${prefix}/*`)],
          }));
        }

        if (actions.includes("list")) {
          role.addToPolicy(new iam.PolicyStatement({
            sid: `${this.sanitize(fnName)}S3${this.sanitize(prefix)}List`,
            actions: ["s3:ListBucket"],
            resources: [this.bucket.bucketArn],
            conditions: { StringLike: { "s3:prefix": `${prefix}/*` } },
          }));
        }

        // Also add to bucket resource policy so bucket-side policy stays in sync
        const objectActions = actions.filter((a) => a !== "list").map((a) => actionMap[a]);
        if (objectActions.length > 0) {
          this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: `Allow${this.sanitize(fnName)}${this.sanitize(prefix)}Objects`,
            principals: [new iam.ArnPrincipal(role.roleArn)],
            actions: objectActions,
            resources: [this.bucket.arnForObjects(`${prefix}/*`)],
          }));
        }
        if (actions.includes("list")) {
          this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            sid: `Allow${this.sanitize(fnName)}${this.sanitize(prefix)}List`,
            principals: [new iam.ArnPrincipal(role.roleArn)],
            actions: ["s3:ListBucket"],
            resources: [this.bucket.bucketArn],
            conditions: { StringLike: { "s3:prefix": `${prefix}/*` } },
          }));
        }
      }
    }

    // ── DynamoDB access ───────────────────────────────────────────────────
    if (config.dynamoAccess && config.dynamoAccess.length > 0) {
      const dynamoActionMap: Record<string, string> = {
        get:    "dynamodb:GetItem",
        put:    "dynamodb:PutItem",
        update: "dynamodb:UpdateItem",
        delete: "dynamodb:DeleteItem",
        query:  "dynamodb:Query",
        scan:   "dynamodb:Scan",
      };
      const dynamoActions = config.dynamoAccess.map((a) => dynamoActionMap[a]);
      role.addToPolicy(new iam.PolicyStatement({
        sid: `${this.sanitize(fnName)}DynamoDB`,
        actions: dynamoActions,
        resources: [mainTable.tableArn],
      }));
    }

    // ── Resolve env vars ──────────────────────────────────────────────────
    const resolvedEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(config.envVars ?? {})) {
      if (typeof v === "string") {
        resolvedEnv[k] = v;
      } else if (v.value !== undefined) {
        resolvedEnv[k] = v.value;
      } else if (v.fromStack) {
        const ref = stackRefs[v.fromStack];
        if (!ref) throw new Error(`Unknown fromStack reference "${v.fromStack}" in ${fnName}/lambda.json`);
        resolvedEnv[k] = ref;
      }
    }

    // ── Lambda function ───────────────────────────────────────────────────
    const arch = config.architecture === "arm64"
      ? lambda.Architecture.ARM_64
      : lambda.Architecture.X86_64;

    const fn = new lambda.Function(this, `${fnName}Fn`, {
      functionName: `${appName}-${this.kebab(fnName)}`,
      description: config.description,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      architecture: arch,
      handler: "bootstrap",
      // fromAsset on a .zip file uploads that specific zip as-is.
      // CDK does NOT re-zip it — it passes it straight to Lambda.
      // This matches exactly what your deploy.sh does with --zip-file fileb://
      code: lambda.Code.fromAsset(latestZip),
      role,
      timeout: cdk.Duration.seconds(config.timeoutSeconds ?? 30),
      memorySize: config.memoryMB ?? 256,
      environment: resolvedEnv,
    });

    // ── Self-update config (abc_software_licensor_dispatcher pattern) ────
    if (config.selfUpdateConfig) {
      // We can't use fn.functionArn here — that would create a circular
      // dependency (role → function → role). Instead we construct the ARN
      // from parts that are all known before the function resource exists.
      const selfArn = cdk.Stack.of(this).formatArn({
        service: "lambda",
        resource: "function",
        resourceName: `${appName}-${this.kebab(fnName)}`,
      });
      role.addToPolicy(new iam.PolicyStatement({
        sid: `${this.sanitize(fnName)}SelfUpdateConfig`,
        actions: [
          "lambda:GetFunctionConfiguration",
          "lambda:UpdateFunctionConfiguration",
        ],
        resources: [selfArn],
      }));
    }

    // ── API Gateway route ─────────────────────────────────────────────────
    if (config.apiGateway) {
      const apigw = config.apiGateway;
      const resource = apiRoot.addResource(apigw.path);
      const proxyResource = resource.addResource("{proxy+}");

      const integration = new apigateway.LambdaIntegration(fn, { proxy: true });

      const methodOptions: apigateway.MethodOptions = apigw.cognitoAuthorizer
        ? {
            authorizer: cognitoAuthorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
          }
        : {};

      for (const method of apigw.methods.filter((m) => m !== "OPTIONS")) {
        resource.addMethod(method, integration, methodOptions);
        proxyResource.addMethod(method, integration, methodOptions);
      }
    }

    new cdk.CfnOutput(this, `${fnName}RoleArn`, {
      value: role.roleArn,
      description: `IAM role for ${fnName}`,
      exportName: `${appName}-${this.kebab(fnName)}-role-arn`,
    });
  }
}
