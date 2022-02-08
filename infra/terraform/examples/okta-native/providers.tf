terraform {
  required_version = ">= 1.0.0"
}

provider "aws" {
  region = "us-east-1"
  alias  = "global_services"
}
