import { Albc } from './albc';
import { Game } from './game';
import * as cdk from 'aws-cdk-lib';
import { Bastion } from './bastion';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as r53 from 'aws-cdk-lib/aws-route53';
import { KubectlV29Layer } from '@aws-cdk/lambda-layer-kubectl-v29';

interface Context {
  role: string,
  repo: string,
  domain: string,
  certArn: string
}

export interface EksPrivateProps extends cdk.StackProps{
  vpc: ec2.IVpc
}

export class EksPrivateStack extends cdk.Stack {
  private context: Context;
  private cluster: eks.Cluster;

  constructor(scope: Construct, id: string, private props: EksPrivateProps) {
    super(scope, id, props);    
    this.context = this.node.tryGetContext('app');
    
    this.createCluster();
    this.createBastion();
    
    new Albc(this, 'Albc', {
      cluster: this.cluster,
      repo: this.context.repo
    });
    
    new Game(this, 'Game', {
      cluster: this.cluster,
      repo: this.context.repo,
      cidr: props.vpc.vpcCidrBlock,
      certArn: this.context.certArn
    });
    
    this.createDns();
  }


  private createCluster() {
    const vpc = this.props.vpc;
    this.cluster = new eks.Cluster(this, 'Cluster', {
      vpc,
      placeClusterHandlerInVpc: true,
      version: eks.KubernetesVersion.V1_29,
      endpointAccess: eks.EndpointAccess.PRIVATE,
      vpcSubnets: [{ subnets: vpc.isolatedSubnets }],
      kubectlEnvironment: {
          // use vpc endpoint, not the global
          "AWS_STS_REGIONAL_ENDPOINTS": 'regional'
      },
      kubectlLayer: new KubectlV29Layer(this, 'Kubectl'),
      mastersRole: iam.Role.fromRoleName(this, 'Master', this.context.role)
    });
  }

  private createBastion() {
    const host = new Bastion(this, 'Bastion', this.props.vpc).host;
    this.cluster.connections.allowFrom(host, ec2.Port.allTcp());
    this.cluster.awsAuth.addMastersRole(host.role);
  }

  private createDns() {
    const dom = this.context.domain.split('.');
    const sub = dom.shift();

    const zone = new r53.PrivateHostedZone(this, 'Zone', {
      vpc: this.props.vpc,
      zoneName: dom.join('.')
    });

    // add record for the game service load balancer
    new r53.CnameRecord(this, 'Cname', {
      zone,
      recordName: sub,
      domainName: this.cluster.getServiceLoadBalancerAddress('service-2048', { 
        namespace: 'game-2048' 
      })
    });
  }
}
