locals {
  name = "cloudfront-auth-example-okta-native"
}

module "auth" {
  source = "github.com/iress/cloudfront-auth//infra/terraform/modules/okta_native"

  release_version = "v3.0.0"
  name            = local.name
  org_url         = "https://my-org.okta.com/oauth2/default"
  client_id       = "Nf2qSD9wXKU9ph8an22T"
  domain_name     = module.cloudfront_s3.domain_name

  providers = {
    aws = aws.global_services
  }
}

module "cloudfront_s3" {
  source = "../cloudfront-s3"

  name       = local.name
  lambda_arn = module.auth.auth_lambda_arn
}
