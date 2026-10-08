#!/bin/bash
set -euo pipefail

STACK_NAME="app-hackatho-rise94f7a1bc-stack"
ARTIFACTS_BUCKET="app-hackatho-rise94f7a1bc-artifacts"
REGION="ap-southeast-1"

echo "==> [1/4] Getting frontend bucket name from stack..."
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text 2>/dev/null || echo "")

echo "==> [2/4] Emptying S3 buckets..."
if [ -n "$FRONTEND_BUCKET" ]; then
  echo "  Emptying frontend bucket: $FRONTEND_BUCKET"
  aws s3 rm "s3://${FRONTEND_BUCKET}/" --recursive --region "$REGION" || true
fi

echo "==> [3/4] Deleting CloudFormation stack..."
aws cloudformation delete-stack \
  --stack-name "$STACK_NAME" \
  --region "$REGION" || true

echo "  Waiting for stack deletion..."
aws cloudformation wait stack-delete-complete \
  --stack-name "$STACK_NAME" \
  --region "$REGION" || true

echo "==> [4/4] Cleaning up artifacts bucket..."
aws s3 rm "s3://${ARTIFACTS_BUCKET}/" --recursive --region "$REGION" || true
aws s3api delete-bucket --bucket "$ARTIFACTS_BUCKET" --region "$REGION" || true

echo ""
echo "✅ Destroy complete."
