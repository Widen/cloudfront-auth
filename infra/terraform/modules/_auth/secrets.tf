resource "aws_secretsmanager_secret" "key_pair" {
  name                    = "${var.name}/key-pair"
  recovery_window_in_days = 0
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_rotation" "key_pair" {
  secret_id           = aws_secretsmanager_secret.key_pair.id
  rotation_lambda_arn = module.rotation.lambda_arn

  rotation_rules {
    automatically_after_days = var.key_pair_rotation_period_days
  }
}
