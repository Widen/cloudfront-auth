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
  default     = {}
}

variable "org_url" {
  description = "The org URL for the Okta environment"
  type        = string
}

variable "client_id" {
  description = "Public identifier for the client (can be found in Okta Admin -> Applications)"
  type        = string
}

variable "domain_name" {
  description = "Domain name of the CloudFront distribution"
  type        = string
}

variable "callback_path" {
  description = "The path of the URI where Okta will send OAuth responses"
  type        = string
  default     = "/_callback"
}

variable "logout_path" {
  description = "The path of the URI where Okta will send OAuth responses"
  type        = string
  default     = "/_logout"
}

variable "session_duration" {
  description = "The number of hours that the JWT is valid for"
  type        = number
  default     = 2
}

variable "pkce_code_verifier_length" {
  description = "Length of the cryptographically random string that is used to correlate the authorization request to the token request (from 43 to 128)"
  type        = number
  default     = 96
}

variable "key_pair_rotation_period_days" {
  description = "The number of days between automatic scheduled rotations of the key pair"
  type        = number
  default     = 7
}

variable "scope" {
  description = "A space delimited list of OKTA scopes which are used by an application during authentication to authorize access to a user's details, openid is required for authentication requests and other scopes like email may also be included."
  type        = string
  default     = "openid email"
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key used to encrypt the key pair"
  type        = string
  default     = null
}

variable "idp" {
  description = "Identity provider to use if there's no Okta Session"
  type        = string
  default     = " "
}
