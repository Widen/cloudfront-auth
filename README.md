# cloudfront-google-auth
Google authentication for [CloudFront](https://aws.amazon.com/cloudfront/) using [Lambda@Edge](http://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html)

Developed as per [Google's OpenID Connect](https://developers.google.com/identity/protocols/OpenIDConnect)

# Description
`cloudfront-google-auth` follows the OpenID Connect spec as described in [Google's documentation](https://developers.google.com/identity/protocols/OpenIDConnect). Upon successful authentication, a cookie (named `token`) with the value of the [OpenId JWT response](https://developers.google.com/identity/protocols/OpenIDConnect#obtainuserinfo) is set and the user redirected back to the orginally requested path. This JWT cookie is checked for validity (signature, expiration date and matching hosted domain) upon each request and `cloudfront-google-auth` will redirect the user to Google login when necessary.

# Usage
1. If your CloudFront distribution is pointed at an S3 bucket, [configure origin access identity](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html#private-content-creating-oai-console) so S3 objects can be stored with private permissions
1. Clone or download this repo
1. Create an OAuth 2.0 client using the [Google Developers Console](https://console.developers.google.com/apis/credentials).
1. Lambda@Edge does not support environment variables, so a config file is necessary to be included in the Lambda upload ZIP. Execute `make` and enter your (Google OAuth credentials)[(https://developers.google.com/identity/protocols/OpenIDConnect#getcredentials)]: client id, client secret, callback path, and hosted domain when prompted.
1. Upload the resulting `cloudfront-google-auth.zip` to Lambda (ZIP contains index.js, package.json, package-lock.json, config.js, and the node_modules directory.)
1. Configure CloudFront to use the Lambda function upon **viewer request**:
  1. Edit CloudFront distribution behavior![alt text](https://lh3.googleusercontent.com/T4b26lGh3yu4SSxXAG3Vb63iuWxTXkqgFTiXNp5i-NCGQ6AgH_Lal5CYse6gZJOpjSK8xKi9kuF8niPKbqjbrTFYDB7n6ZNv-mANWytL_zatFwDamFQZ_1RnDnEAGkXfrKONRNfJh6w8qjLHKuCk1JWnqsIWYnIr44J2j6wFKceasggPxnh8IfhC869-Pz3GRC6AvURWLOVoQWZI5tp7NQ6U4NGZ-dI-bEjOSTqx96PEnlbIY4r-Js76SgbKI_94aow5eMXmhbGFcsheUIZ5jRXJ6NT9Z3SpPEw0tvJwqDEs5UyM8xva_Ghb33EsV3bfDzZbaKoCXk3diKnBCV5BTpfx8szaiOxiqHZY8wfFEZfkeZi-sZECSAECcnXcIWVEGId52vjtQmNi0krfwcAUSHzkEMB3E3jHMH2fd8q3Pp8YO5w1A2wgAE_SDVuT6JRS-i1vFoRx-OkfSpNI4kdY7Uh4MxvP6fR_hNVPCxilM9y0D_S8ln7MWAPE_7V3RkV214SObk_PoU4dW3u67PD1BUfD8kR96Kf6UV8s5IhM61ks9u1PvbFj822y51CWAhTRe02tcwPdB9Km0jbYXYgzkPFkzPXCYCKeTLCg0m2m4HAUS5SL7P3ftYN98FyOdYYrbtmYiJtwatH6gjwfyX6ENc2rDMa4A8Q=w1684-h586-no "Edit behavior")
  1. Point to Lambda function on viewer request (bottom of edit page)![alt text](https://lh3.googleusercontent.com/9YGTDMxX-9q_3GhW-w9ORcWejG3ZoQUBhviVb3_Dr1iCuvbmvSHM0WXLZ5UrlvUzkuDcfBtJJMqF5C7kWdJuG5P2abOiBNhLoxTF41oQqOzyWofio6TCTW_56SjjaMCzDyocusbx9GzOaJNHAWIIvDXByLwfHCaWQf7VcGdBx4WnwKwvq5_08Pv2G2JIkznTRzSrpd6KbMpkSUT7H3dOO-mZbPEl6NKvmIJ0iAW834R4KSx0gHEtzTLYu6FPN0oWHkQwGHh2x4kmBaSp1WyxaE98okVe3QMZ_bYPt2NDVSQHuPcd3mOQAjJBNnyBoq5zgJYe5r5AdSbyIJ7bfJDthUcqk_ZL67DJ39_NkFrdyJN2A5n5Iunn2axtN7vMlsi54WxfcQFpxTs3x_2QPRYGEaYUnjuLVpS7ZdlDgp3-46pUqEISCOAVb5wMU2lY4KFEdEiSOccKcvjuyK25GxvDvGkZTR5xP6DRm8A6uOmQbOEEL5M9OMB0_OS5pMW_DWAnXeqwHSLZk42Wc58YyJlLSZ0WBnFPvAHoEuV2N-mYL6NhKSoLBEK_HM6TyEH03SolS6baVyTH_cPSDwya-N7EQtnyM1aL3WKaKv6V_ETTH3g8zOB-EydUbjpEEPyUJrjqFsrHNQieeksEGIWe0gqX93r7FpxiLXk=w1528-h298-no "Point to Lambda function on viewer request")

#### Configuration
Example config.js
```
const CLIENT_ID = '1234-t84f8fjwyo94.apps.googleusercontent.com';
const CLIENT_SECRET = 'HGUjgeU_KirjcKrjk2kf';
const CALLBACK_PATH = '/_callback';
const HOSTED_DOMAIN = 'example.com';

exports.CLIENT_ID = CLIENT_ID;
exports.CLIENT_SECRET = CLIENT_SECRET;
exports.CALLBACK_PATH = CALLBACK_PATH;
exports.HOSTED_DOMAIN = HOSTED_DOMAIN;
```

#### Requirements: [npm](https://www.npmjs.com/) ^5.6.0
