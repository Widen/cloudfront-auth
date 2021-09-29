variable "name" {
  description = "A name for the AWS resources created by this module"
  type        = string
}

variable "tags" {
  description = "Tags to add to each resource"
  type        = map(string)
}

variable "package_url" {
  description = "The URL of the function's deployment package"
  type        = string
}

variable "timeout" {
  description = "The amount of time the Lambda function has to run in seconds"
  type        = number
  default     = 3
}

variable "iam_policy_override_json" {
  description = "An IAM policy document to extend and/or override the default policy document"
  type        = string
  default     = null
}

variable "lambda_at_edge" {
  description = "Whether the function is to be used with Lambda@Edge"
  type        = bool
  default     = false
}

variable "kms_key_arn" {
  description = "kms key to encrypt secrets manager secret"
  type        = string
  default     = null
}
