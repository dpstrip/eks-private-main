# example:  ./scripts/images.sh my-repo

region=$(aws configure list | grep region | awk '{print $2}')
account=$(aws sts get-caller-identity --query 'Account' --output text)
registry=$account.dkr.ecr.$region.amazonaws.com

/d/crane/crane pull k8s.gcr.io/e2e-test-images/echoserver:2.5 echo.tar

aws ecr get-login-password | /d/crane/crane auth login -u AWS --password-stdin $registry

# create repo, ignore errors if it already exists
aws ecr create-repository --repository-name $1 &> /dev/null || true

/d/crane/crane push echo.tar $registry/$1:echo

# set repo name in cdk.json
sed -i "s|.*repo.*|      \"repo\": \"$registry/$1\",|g" cdk.json

# cleanup
rm echo.tar