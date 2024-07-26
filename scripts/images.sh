# example:  ./scripts/images.sh my-repo

region=$(aws configure list | grep region | awk '{print $2}')
account=$(aws sts get-caller-identity --query 'Account' --output text)
registry=$account.dkr.ecr.$region.amazonaws.com

/d/crane/crane pull public.ecr.aws/l6m2t8p7/docker-2048:latest game.tar
/d/crane/crane pull public.ecr.aws/eks/aws-load-balancer-controller:v2.8.1 albc.tar

aws ecr get-login-password | /d/crane/crane auth login -u AWS --password-stdin $registry

# create repo, ignore errors if it already exists
aws ecr create-repository --repository-name $1 &> /dev/null || true

/d/crane/crane push game.tar $registry/$1:game
/d/crane/crane push albc.tar $registry/$1:albc

# set repo name in cdk.json
sed -i "s|.*repo.*|      \"repo\": \"$registry/$1\",|g" cdk.json

# cleanup
rm game.tar albc.tar