variable "release_version" {
  description = "The name of the GitHub release version to deploy"
  type        = string
}

variable "name" {
  description = "A name for the AWS resources created by this module"
  type        = string
}

variable "tags" {
  description = "Tags to add to each resource"
  type        = map(string)
}

variable "package_url" {
  description = "The URL of the Lambda authentication function package"
  type        = string
}

variable "key_pair_rotation_period_days" {
  description = "The number of days between automatic scheduled rotations of the key pair"
  type        = number
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key used to encrypt the key pair"
  type        = string
  default     = null
}
