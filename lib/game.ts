import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';

interface GameProps{
    cidr: string,
    repo: string,
    certArn: string,
    cluster: eks.Cluster
}

export class Game extends Construct{
  private manifest: any;

  constructor(scope: Construct, id: string, private props: GameProps) {
    super(scope, id);
    
    this.manifest = this.loadManifest();
    this.configImage();
    this.configService();
    this.removeIngress();

    new eks.KubernetesManifest(this, 'game-2048', {
      manifest: this.manifest,
      cluster: this.props.cluster
    });
  }

  private loadManifest() {
    const f = fs.readFileSync('assets/2048_full.yaml', 'utf8');
    return yaml.loadAll(f) as any;
  }

  // ingress creates an ALB, we want NLB (service)
  private removeIngress() {
    const i = this.manifest.findIndex((m: any) => m.kind == 'Ingress');
    this.manifest.splice(i, 1);
  }

  private configImage(){
    const d = this.manifest.find((m: any) => m.kind == 'Deployment');
    d.spec.template.spec.containers[0].image = `${this.props.repo}:game`;
  }

  // https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/guide/service/annotations/
  private configService() {
    const svc = this.manifest.find((m: any) => m.kind == 'Service');
    svc.spec.type = 'LoadBalancer';
    svc.spec.ports = [{
      port: 443,
      targetPort: 80,
      protocol: 'TCP'
    }];
    svc.spec.loadBalancerSourceRanges = [ this.props.cidr ];
    svc.metadata.annotations = {
      'service.beta.kubernetes.io/aws-load-balancer-type': 'external',
      'service.beta.kubernetes.io/aws-load-balancer-nlb-target-type': 'ip',
      'service.beta.kubernetes.io/aws-load-balancer-ssl-cert': this.props.certArn
    };
  }
}