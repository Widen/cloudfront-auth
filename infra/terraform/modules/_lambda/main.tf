locals {
  package_directory = "${path.module}/packages"
  package_filename  = basename(var.package_url)
}

# Always download the lambda package if it does not exist
resource "null_resource" "download" {
  triggers = {
    always_run = uuid()
  }

  provisioner "local-exec" {
    command = "test -f ${local.package_directory}/${local.package_filename} || (mkdir -p ${local.package_directory} && wget -P ${local.package_directory} ${var.package_url})"
  }
}

resource "aws_lambda_function" "main" {
  filename         = "${local.package_directory}/${local.package_filename}"
  function_name    = var.name
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = base64sha256(var.package_url)
  runtime          = "nodejs14.x"
  timeout          = var.timeout
  publish          = var.lambda_at_edge
  tags             = var.tags

  # Ensure the lambda function is created after the package is downloaded
  depends_on = [
    null_resource.download
  ]
}
