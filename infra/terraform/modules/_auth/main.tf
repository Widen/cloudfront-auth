data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_iam_policy_document" "auth" {
  statement {
    actions   = ["ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.name}"]
  }

  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.name}/*"]
  }
}

data "aws_iam_policy_document" "rotation" {
  statement {
    actions   = ["secretsmanager:PutSecretValue"]
    resources = ["arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.name}/*"]
  }
}

module "auth" {
  source = "../_lambda"

  name                     = var.name
  tags                     = var.tags
  package_url              = var.package_url
  timeout                  = 5
  iam_policy_override_json = data.aws_iam_policy_document.auth.json
  lambda_at_edge           = true
}

module "rotation" {
  source = "../_lambda"

  name                     = "${var.name}-rotation"
  tags                     = var.tags
  package_url              = "https://github.com/iress/cloudfront-auth/releases/download/${var.release_version}/rotate_key_pair.zip"
  timeout                  = 30
  iam_policy_override_json = data.aws_iam_policy_document.rotation.json
}

resource "aws_lambda_permission" "allow_secrets_manager" {
  statement_id  = "AllowExecutionFromSecretsManager"
  action        = "lambda:InvokeFunction"
  function_name = module.rotation.lambda_arn
  principal     = "secretsmanager.amazonaws.com"
}
