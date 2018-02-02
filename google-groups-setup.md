# Setup to use Google Groups to authorize users

1.

```
{
  "type": "service_account",
  "project_id": "example",
  "private_key_id": "h54h8t1eg65s1d6fg1re81r651g",
  "private_key": "-----BEGIN PRIVATE KEY-----\ndh54et5aa4rg5d4fht5e4h5d4fg5sdf54h5sh65s1651h51s\n-----END PRIVATE KEY-----\n",
  "client_email": "cloudfront-google-authz@example.iam.gserviceaccount.com",
  "client_id": "452521516513132321315",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://accounts.google.com/o/oauth2/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/cloudfront-google-authz%40example.iam.gserviceaccount.com",
  "cloudfront_authz_groups": [ "foo@example.com", "bar@example.com" ]
}

```
