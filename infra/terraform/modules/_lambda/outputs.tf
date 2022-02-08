output "lambda_arn" {
  value       = var.lambda_at_edge ? aws_lambda_function.main.qualified_arn : aws_lambda_function.main.arn
  description = "The Amazon Resource Name (ARN) identifying the Lambda Function Version"
}
