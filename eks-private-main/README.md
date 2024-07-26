# Private EKS Cluster


This example deploys the [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest) and [2048 game](https://play2048.co/) with NLB into a private eks cluster using local assets.

## Install

Follow [instructions](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) to install CDK and bootstrap your account. &nbsp;You will also need a container image tool such as [Crane](https://github.com/google/go-containerregistry/blob/main/cmd/crane/README.md) or Docker.

## Assets

All assets have already been included in the assets folder by running the script below. The game manifest is modified within CDK to deploy a Network Load Balancer. 

`./scripts/assets.sh`

## Deploy

**Role**

In cdk.json, set role to your AWS console role which will be added to the EKS system masters.

**Images**

Run the script below to retrieve images for the ALB Controller and game, then push them to ECR.  The repo will be added to cdk.json and created if it does not exist.

`./scripts/images.sh <repo>`

**Certificate**

Create a self-signed certificate for offloading TLS on the NLB and import it into ACM. The domain and cert ARN are added to cdk.json.


`./scripts/cert.sh <domain e.g. game.test.com>`

**Stacks**

Deploy the CDK stacks 

`cdk deploy --all`

## Test

Run curl from bastion 

`curl -k https://<domain>`