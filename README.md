This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

* `UPDATE_FN_URL` - URL of API endpoint for updating the CMS data.
* `REBUILD_URL` - URL to rebuild the repo
* `URL_DOWNLOADS`
* `URL_BLOGS`
* `URL_PRODUCTS`
* `URL_WEB_APPS`
* `PRESIGN_URL` - URL of API endpoint for S3 presign requests
* `SOFTWARE_LICENSOR_DISPATCH_API` - URL of API endpoint

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Setup tech stack

```sh
tar -xvzf ./infra-cdk-v2.tar.gz
cd ./infra-cdk-v2/
npm install
# place lambda function build zips into infra-cdk-v2/lambdas/*/builds
# builds need to be built for aarch64
cdk bootstrap aws://AWS_ACCOUNT/REGION
# obtain aws account number from:
aws sts get-caller-identity
# e.g. `cdk bootstrap aws://123456789012/us-east-1`
cdk deploy \
--context appName=abc-dev \
--context siteDomain=dev.alteredbrainchemistry.com \
--context hostedZoneDomain=alteredbrainchemistry.com \
--context cdnSubdomain=hephaestus \
--context githubRepo=nstilt1/abcSite \
--context githubBranch=master \
--context githubTokenSsmPath=/abc/github-token

# Get the build role name and app id
APP_ID=$(aws cloudformation describe-stacks --stack-name SiteStack \
  --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppId'].OutputValue" \
  --output text)

AMPLIFY_ROLE=$(aws amplify get-app --app-id $APP_ID \
  --query "app.iamServiceRoleArn" \
  --output text)
echo $AMPLIFY_ROLE

# Deploy again with the build role specified:
cdk deploy \
--context appName=abc-dev \
--context siteDomain=dev.alteredbrainchemistry.com \
--context hostedZoneDomain=alteredbrainchemistry.com \
--context cdnSubdomain=hephaestus \
--context githubRepo=nstilt1/abcSite \
--context githubBranch=master \
--context githubTokenSsmPath=/abc/github-token \
--context amplifyBuildRoleArn=arn:aws:iam::744502367450:role/SiteStack-AmplifyAppRole0364E92A-NLGEpz0kwvYl
```