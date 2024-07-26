import * as fs from 'fs';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3Assets from 'aws-cdk-lib/aws-s3-assets';
import { loadAll } from 'js-yaml';
import * as yaml from 'js-yaml';

interface AlbcProps{
    repo: string,
    cluster: eks.Cluster
}

// https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/deploy/installation/
//This is the creation of the iam policy
export class Albc extends Construct{
  constructor(scope: Construct, id: string, private props: AlbcProps) {
    super(scope, id);

    const sa = props.cluster.addServiceAccount('AlbSa', {
      name: 'aws-load-balancer-controller'
    });

    const doc = JSON.parse(fs.readFileSync('assets/iam_policy.json', 'utf-8'));
    sa.role.addManagedPolicy(new iam.ManagedPolicy(this, 'AWSLoadBalancerControllerIAMPolicy', {
        document: iam.PolicyDocument.fromJson(doc)
    }));

    //loading manifest for cert manager  Doesn't work.  Yaml file too big.
    const certMgr = this.loadManfest('assets/deploy2048.yaml');
    this.applyManifest('apply-cert-Manager', props.cluster, certMgr);


    props.cluster.addHelmChart('AlbChart', {
      chartAsset: new s3Assets.Asset(this, 'AlbAsset', {
          path: 'assets/aws-load-balancer-controller'
      }),
      values: {
          image: { 
            repository: props.repo,
            tag: 'albc'
          },
          clusterName: props.cluster.clusterName,
          serviceAccount: {
              create: false,
              name: 'aws-load-balancer-controller'
          }
      }
  });

  }

  loadManfest(path: string): Record<string, any>[]{
    const manifestYaml = fs.readFileSync(path, 'utf-8');
    return loadAll(manifestYaml) as Record<string, any[]>[];
  }

  applyManifest(id: string, cluster: eks.Cluster, manifest: Record<string, any>[]): eks.KubernetesManifest{
    return new eks.KubernetesManifest(this, id, {
      cluster: cluster,
      manifest: manifest,
      overwrite: true,
      skipValidation: true
    });
  }
    
}