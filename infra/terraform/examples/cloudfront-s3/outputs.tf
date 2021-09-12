output "domain_name" {
  value       = aws_cloudfront_distribution.example.domain_name
  description = "The domain name corresponding to the CloudFront distribution"
}
