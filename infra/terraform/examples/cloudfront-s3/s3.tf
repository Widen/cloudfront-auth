resource "aws_s3_bucket" "example" {
  bucket_prefix = "${var.name}-"
  acl           = "private"
}

data "aws_iam_policy_document" "oai_access" {
  statement {
    sid       = "Allow-OAI-Access-To-Bucket"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.example.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.example.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "oai_access" {
  bucket = aws_s3_bucket.example.id
  policy = data.aws_iam_policy_document.oai_access.json
}

resource "aws_s3_bucket_object" "index" {
  bucket       = aws_s3_bucket.example.id
  key          = "index.html"
  source       = "${path.module}/index.html"
  content_type = "text/html"
}
