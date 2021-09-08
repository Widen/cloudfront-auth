module "cloudfront_auth_okta_native" {
  source = "github.com/iress/cloudfront-auth//infra/terraform/modules/okta_native"

  release_version = "v3.0.0"
  name            = "my-website-auth"
  org_url         = "https://my-org.okta.com/oauth2/default"
  client_id       = "Nf2qSD9wXKU9ph8an22T"
  domain_name     = "my-cloudfront-site.example.com"

  providers = {
    aws = aws.global_services
  }
}
