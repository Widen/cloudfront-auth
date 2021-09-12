variable "name" {
  description = "A name for the AWS resources created by this module"
  type        = string
}

variable "lambda_arn" {
  description = "The Amazon Resource Name (ARN) identifying the Lambda Function Version to associate with the CloudFront distribution"
  type        = string
}
