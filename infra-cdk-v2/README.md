# Site Infrastructure — AWS CDK v2

## How Lambdas work in this setup

The CDK stack **auto-discovers** Lambda functions from the `lambdas/` directory.
Each subfolder is one Lambda function. Drop in a folder, run `cdk deploy`, done.

```
lambdas/
├── lambda.schema.json              ← Schema reference (not deployed)
└── update_content_abc/             ← One Lambda per folder
    ├── lambda.json                 ← Declares role, env vars, arch, API route
    └── builds/
        └── 26-04-27_update_content_abc.zip   ← Latest build (sorted by filename)
```

The CDK stack:
1. Reads `lambda.json` for configuration
2. Picks the **last alphabetically-sorted `.zip`** from `builds/` as the deployment package
3. Creates an IAM role with exactly the S3 permissions declared in `lambda.json`
4. Injects env vars, resolving `fromStack` references to real ARNs/names at synth time
5. Wires an API Gateway route if `apiGateway` is declared

---

## Your existing lambda (`update_content_abc`)

### What role it gets

The CDK stack creates a role named `{appName}-update_content_abc-role` with:

| Permission | Resource |
|-----------|---------|
| `s3:PutObject` | `{bucket}/content/*` |
| `s3:PutObject` | `{bucket}/media/*` |
| `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` | CloudWatch (via AWSLambdaBasicExecutionRole) |

This matches what `main.rs` actually does — it only calls `put_object`.
The bucket policy also gets matching statements so both sides are in sync.

### What env vars it gets

Your `shared` crate reads `CONTENT_BUCKET`. The `lambda.json` maps it:

```json
"CONTENT_BUCKET": { "fromStack": "bucketName" }
```

CDK resolves this to the actual bucket name at synth time. No hardcoding.

### Deploying a new build

Your existing `build.sh` / `build-cargo-lambda.sh` workflow stays exactly the same.
Just drop the new `.zip` into `builds/` and run `cdk deploy` — it picks up the newest zip automatically.

```bash
# Your existing build (from update_content_abc/)
./build.sh
# or
./build-cargo-lambda.sh

# Then deploy infrastructure (from infra-cdk-v2/)
cdk deploy --context appName=mysite --context domainName=mysite.com ...
```

---

## Adding a new Lambda in the future

1. Create a folder: `lambdas/my_new_function/`
2. Create `lambdas/my_new_function/lambda.json`:

```json
{
  "description": "Does something useful",
  "architecture": "arm64",
  "runtime": "provided.al2023",
  "timeoutSeconds": 30,
  "memoryMB": 256,

  "envVars": {
    "CONTENT_BUCKET": { "fromStack": "bucketName" },
    "S3_BUCKET_REGION": { "fromStack": "region" },
    "RUST_LOG": "info"
  },

  "s3Access": {
    "content": ["get", "put", "delete"],
    "media": ["get"]
  },

  "apiGateway": {
    "path": "my-new-function",
    "methods": ["POST"],
    "cognitoAuthorizer": true
  }
}
```

3. Create `lambdas/my_new_function/builds/` and add your compiled `.zip`
4. Run `cdk deploy`

No changes to the CDK stack code needed.

---

## `fromStack` values

Use these in `lambda.json` `envVars` to reference stack resources without hardcoding:

| `fromStack` value | Resolves to |
|-------------------|------------|
| `bucketName` | S3 bucket name |
| `region` | AWS region |
| `userPoolId` | Cognito User Pool ID |
| `userPoolClientId` | Cognito App Client ID |
| `apiUrl` | API Gateway invoke URL |
| `cdnUrl` | `https://cdn.yourdomain.com` |

---

## `s3Access` actions

| Action | IAM permission granted |
|--------|----------------------|
| `get` | `s3:GetObject` on `{prefix}/*` |
| `put` | `s3:PutObject` on `{prefix}/*` |
| `delete` | `s3:DeleteObject` on `{prefix}/*` |
| `list` | `s3:ListBucket` on bucket, scoped to `{prefix}/*` |

---

## DNS setup

Your domain is currently in Lightsail DNS. CDK needs Route 53.
You have two options:

### Option A: Migrate the whole domain to Route 53 (recommended long-term)

1. Go to **Route 53 → Hosted zones → Create hosted zone**
   - Domain: `alteredbrainchemistry.com`
   - Type: Public hosted zone
2. Route 53 gives you 4 NS records (e.g. `ns-123.awsdns-45.com`)
3. Go to **Lightsail → Networking → DNS zones → alteredbrainchemistry.com**
4. Note down all your existing DNS records (copy them somewhere)
5. In **Namecheap / your registrar** (wherever you bought the domain), update the nameservers to the 4 Route 53 NS values
6. Recreate your existing Lightsail records in Route 53 (your Lightsail instance IPs, etc.)

DNS propagation takes up to 48 hours but usually under 1 hour.

### Option B: Delegate only `dev.*` to Route 53 (less disruptive)

Keep Lightsail DNS for everything else; only Route 53 handles `dev.*`:

1. Create a Route 53 hosted zone for `dev.alteredbrainchemistry.com` (not the root)
2. Route 53 gives you NS records for that zone
3. In **Lightsail DNS**, add an NS record:
   - Name: `dev`
   - Value: the 4 NS records Route 53 gave you (one record each)

Now `dev.alteredbrainchemistry.com` and `cdn.dev.alteredbrainchemistry.com` resolve via Route 53.
Everything else (`www`, root, etc.) stays in Lightsail untouched.

When you're ready to go to production, do Option A.

---

## First-time deploy

```bash
# 1. Find your AWS account ID
aws sts get-caller-identity
# Note the "Account" value — use it in the next command

# 2. Bootstrap CDK (once per account/region)
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 3. Store your GitHub personal access token in SSM
#    Get one at: GitHub → Settings → Developer settings → Personal access tokens
#    Needs: repo scope
aws ssm put-parameter \
  --name /abc/github-token \
  --value ghp_YOUR_TOKEN_HERE \
  --type SecureString
# This stores the token in AWS — not a local file. The path /abc/github-token
# is just a name you choose. It has no relation to your repo directory.

# 4. Build your Rust lambda
cd ../update_content_abc && ./build.sh && cd ../infra-cdk-v2

# 5. Install CDK deps and deploy (dev subdomain)
npm install
cdk deploy \
  --context appName=abc-dev \
  --context siteDomain=dev.alteredbrainchemistry.com \
  --context hostedZoneDomain=alteredbrainchemistry.com \
  --context cdnSubdomain=hephaestus \
  --context githubRepo=yourname/yourrepo \
  --context githubBranch=dev \
  --context githubTokenSsmPath=/abc/github-token
```

## Switching to production (root domain)

When you're ready to go live at `alteredbrainchemistry.com`:

```bash
cdk deploy \
  --context appName=abc \
  --context siteDomain=alteredbrainchemistry.com \
  --context hostedZoneDomain=alteredbrainchemistry.com \
  --context cdnSubdomain=hephaestus \
  --context githubRepo=yourname/yourrepo \
  --context githubBranch=main \
  --context githubTokenSsmPath=/abc/github-token \
  --context mapRootAndWww=true
```

This maps both `alteredbrainchemistry.com` and `www.alteredbrainchemistry.com` to Amplify,
and `cdn.alteredbrainchemistry.com` to CloudFront.

## After first deploy — wire Amplify role

Amplify creates its backend IAM role on first build. Pass it back on the second deploy:

```bash
cdk deploy \
  --context appName=abc-dev \
  --context siteDomain=dev.alteredbrainchemistry.com \
  ... \
  --parameters AmplifyBuildRoleArn=arn:aws:iam::744502367450:role/abc-dev-amplifyconsole-backend-role
```

---


---

## Seed content files

`seed-content/` contains the initial S3 content files, uploaded to `content/` on first deploy:

| File | Initial value |
|------|--------------|
| `downloads.json` | `[]` |
| `products.json` | `[]` |
| `blogs.json` | `[]` |
| `webapps.json` | `[]` |

The deployment is **non-destructive** (`prune: false`) — it only uploads files that don't already exist in the bucket. Once your Rust lambda has written real data to these files, redeploying won't overwrite them.

To manually reset a file back to `[]`:
```bash
aws s3 cp seed-content/products.json s3://abc-dev-frontend-bucket/content/products.json
```

To add a new seed file in the future, just drop it in `seed-content/` and redeploy.

## Architecture note on your build scripts

Your `build.sh` uses `cross build --target aarch64-unknown-linux-gnu` (ARM64 GNU/musl).
The CDK `lambda.json` has `"architecture": "arm64"` to match. Keep using `build.sh` —
it produces a smaller binary than `cargo lambda build`.
