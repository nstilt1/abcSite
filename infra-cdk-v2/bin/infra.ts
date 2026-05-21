#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { execSync } from "child_process";
import { SiteStack } from "../lib/site-stack";

// ── Example: subdomain (dev) mode ─────────────────────────────────────────
// cdk deploy \
//   --context appName=abc-dev \
//   --context siteDomain=dev.alteredbrainchemistry.com \
//   --context hostedZoneDomain=alteredbrainchemistry.com \
//   --context cdnSubdomain=hephaestus \
//   --context githubRepo=nstilt1/abcSite \
//   --context githubBranch=master \
//   --context githubTokenSsmPath=/abc/github-token
//
// ── Example: root domain (production) mode ────────────────────────────────
// cdk deploy \
//   --context appName=abc \
//   --context siteDomain=alteredbrainchemistry.com \
//   --context hostedZoneDomain=alteredbrainchemistry.com \
//   --context cdnSubdomain=hephaestus \
//   --context githubRepo=nstilt1/abcSite \
//   --context githubBranch=main \
//   --context githubTokenSsmPath=/abc/github-token \
//   --context mapRootAndWww=true

const app = new cdk.App();

const siteDomain       = app.node.tryGetContext("siteDomain")         ?? "dev.alteredbrainchemistry.com";
const hostedZoneDomain = app.node.tryGetContext("hostedZoneDomain")   ?? "alteredbrainchemistry.com";
const mapRootAndWwwCtx = app.node.tryGetContext("mapRootAndWww");
const ssmPath          = app.node.tryGetContext("githubTokenSsmPath")  ?? "/abc/github-token";

// ── Fetch GitHub token from SSM at synth time ─────────────────────────────
// CloudFormation cannot resolve SSM SecureString dynamic references inside
// AWS::Amplify::App OauthToken — it's simply not supported by that resource.
// We read the value here (where we have AWS credentials) and pass it to CDK
// as a CloudFormation NoEcho parameter so it stays out of logs and console.
function readSsmToken(paramPath: string): string {
  try {
    const value = execSync(
      `aws ssm get-parameter --name "${paramPath}" --with-decryption --query Parameter.Value --output text`,
      { stdio: ["pipe", "pipe", "pipe"] }
    ).toString().trim();
    if (!value) throw new Error("parameter value was empty");
    return value;
  } catch (err) {
    throw new Error(
      `\n❌  Could not read SSM parameter "${paramPath}".\n` +
      `    Make sure it exists: aws ssm put-parameter --name "${paramPath}" --value ghp_xxx --type SecureString\n` +
      `    And that your IAM user has ssm:GetParameter permission.\n\n${err}`
    );
  }
}

const githubTokenValue = readSsmToken(ssmPath);

new SiteStack(app, "SiteStack", {
  appName:            app.node.tryGetContext("appName")      ?? "abc-dev",
  siteDomain,
  hostedZoneDomain,
  cdnSubdomain:       app.node.tryGetContext("cdnSubdomain") ?? "hephaestus",
  mapRootAndWww:      mapRootAndWwwCtx === "true"  ? true
                    : mapRootAndWwwCtx === "false" ? false
                    : undefined,
  amplifyBuildRoleArn: app.node.tryGetContext("amplifyBuildRoleArn") ?? "",
  githubRepo:         app.node.tryGetContext("githubRepo")   ?? "owner/repo",
  githubBranch:       app.node.tryGetContext("githubBranch") ?? "master",
  githubTokenSsmPath: ssmPath,
  // Pass the resolved token value so the stack can inject it into the
  // CloudFormation NoEcho parameter without using SSM dynamic references.
  githubTokenValue,
  lambdasDir: path.resolve(
    app.node.tryGetContext("lambdasDir") ?? path.join(__dirname, "..", "lambdas")
  ),
  frontendEnvVars: {
    // Add any extra NEXT_PUBLIC_ vars your Next.js build needs:
    // FRONTEND_BUILD_URL: "https://dev.alteredbrainchemistry.com",
  },
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
