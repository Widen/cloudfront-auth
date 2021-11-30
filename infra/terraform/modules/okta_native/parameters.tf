resource "aws_ssm_parameter" "base_url" {
  name  = "/${var.name}/base-url"
  type  = "String"
  value = var.org_url
  tags  = var.tags
}

resource "aws_ssm_parameter" "client_id" {
  name  = "/${var.name}/client-id"
  type  = "String"
  value = var.client_id
  tags  = var.tags
}

resource "aws_ssm_parameter" "domain_name" {
  name  = "/${var.name}/domain-name"
  type  = "String"
  value = var.domain_name
  tags  = var.tags
}

resource "aws_ssm_parameter" "callback_path" {
  name  = "/${var.name}/callback-path"
  type  = "String"
  value = var.callback_path
  tags  = var.tags
}

resource "aws_ssm_parameter" "session_duration" {
  name  = "/${var.name}/session-duration"
  type  = "String"
  value = var.session_duration * 60 * 60
  tags  = var.tags
}

resource "aws_ssm_parameter" "pkce_code_verifier_length" {
  name  = "/${var.name}/pkce-code-verifier-length"
  type  = "String"
  value = var.pkce_code_verifier_length
  tags  = var.tags
}

resource "aws_ssm_parameter" "scope" {
  name  = "/${var.name}/scope"
  type  = "String"
  value = var.scope
  tags  = var.tags
}

resource "aws_ssm_parameter" "idp" {
  name  = "/${var.name}/idp"
  type  = "String"
  value = var.idp
  tags  = var.tags
}
