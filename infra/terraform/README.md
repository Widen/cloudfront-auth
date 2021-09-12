# Terraform Modules for CloudFront Authentication

This directory contains the _Terraform_ configuration for adding authentication to a CloudFront distribution. Currently only OKTA Native authentication is supported.

## Usage

The Terraform modules for each identity provider are in the [modules](./modules) directory. Refer to the [examples](./examples) directory for Terraform configuration that you can include in your project and adapt. Refer to the `variables.tf` file of the module to see all the available input variables. Below is an example for OKTA Native.

1. Call the module in your Terraform configuration. CloudFront uses the `us-east-1` region, so you must pass a `us-east-1` provider to the module.

    ```hcl
    module "auth" {
      source = "github.com/iress/cloudfront-auth//infra/terraform/modules/okta_native"

      # Lambda function version to deploy (see the Releases page of this GitHub repository)
      release_version = "v3.0.0"

      name        = "my-website-auth"
      org_url     = "https://my-org.okta.com/oauth2/default"
      client_id   = "Nf2qSD9wXKU9ph8an22T"
      domain_name = "my-cloudfront-site.example.com"

      # aws.global_services is a us-east-1 provider
      providers = {
        aws = aws.global_services
      }
    }
    ```

1. Add a [lambda_function_association](https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html#lambda_function_association) to your [aws_cloudfront_distribution](https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html) resource:

    ```hcl
    resource "aws_cloudfront_distribution" "distribution" {
      # ... other configuration ...

      # lambda_function_association is also supported by ordered_cache_behavior
      default_cache_behavior {
        # ... other configuration ...

        lambda_function_association {
          event_type = "viewer-request"
          lambda_arn = module.auth.auth_lambda_arn
        }
      }
    }
    ```

## Requirements

This module requires [wget](https://www.gnu.org/software/wget/) to be installed on the machine or container that runs Terraform.

## Logs

Logs are written to CloudWatch. The table below shows where the logs can be found, where {name} is the value of the `name` input variable in the Terraform module.

| Function | Log group name | Region |
|----------|----------------|--------|
| Authentication  | /aws/lambda/us-east-1.{name} | The region closest to the user who made the request to the website
| Secret rotation | /aws/lambda/{name}-rotation | us-east-1

## Destroying

The first time you run `terraform destroy` you may receive the following error:

*Lambda was unable to delete arn:aws:lambda:us-east-1:553479592532:function:my-website-auth:1 because it is a replicated function. Please see our [documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-delete-replicas.html) for Deleting Lambda@Edge Functions and Replicas.*

When this occurs, wait (up to a few hours) for CloudFront to delete the Lambda function replicas, then run `terraform destroy` again.
