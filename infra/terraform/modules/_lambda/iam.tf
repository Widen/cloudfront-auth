data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = var.lambda_at_edge ? ["lambda.amazonaws.com", "edgelambda.amazonaws.com"] : ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "execution" {
  override_policy_documents = var.iam_policy_override_json == null ? [] : [
    var.iam_policy_override_json
  ]

  statement {
    sid = "logs"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]

    resources = ["arn:aws:logs:*:*:*"]
  }

  dynamic "statement" {
    for_each = var.kms_key_arn != null ? [var.kms_key_arn] : []
    content {
      actions   = ["kms:Decrypt","kms:GenerateDataKey"]
      resources = [ statement.value ]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = var.name
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy" "execution" {
  name   = var.name
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.execution.json
}
