output "auth_lambda_arn" {
  value       = module.auth.auth_lambda_arn
  description = "The Amazon Resource Name (ARN) identifying the authentication Lambda Function Version"
}
