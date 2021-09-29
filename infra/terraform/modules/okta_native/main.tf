module "auth" {
  source = "../_auth"

  release_version               = var.release_version
  name                          = var.name
  tags                          = var.tags
  package_url                   = "https://github.com/iress/cloudfront-auth/releases/download/${var.release_version}/okta_native.zip"
  key_pair_rotation_period_days = var.key_pair_rotation_period_days
  kms_key_arn                   = var.kms_key_arn
}
