output "domain_name" {
  value       = module.cloudfront_s3.domain_name
  description = "The domain name corresponding to the CloudFront distribution"
}
