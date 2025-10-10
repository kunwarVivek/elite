# 🚀 Angel Investing Marketplace - Production Deployment Guide

This comprehensive guide covers the complete production deployment process for the Angel Investing Marketplace application.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Application Deployment](#application-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Security Configuration](#security-configuration)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)
- [Scaling](#scaling)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/angel-investing-marketplace.git
cd angel-investing-marketplace

# Set up environment variables
cp .env.example .env.production
# Edit .env.production with your values

# Generate secrets
cd docker/secrets
chmod +x generate-secrets.sh
./generate-secrets.sh
```

### 2. Infrastructure Provisioning

```bash
# Initialize Terraform
cd terraform/environments/prod
terraform init
terraform plan
terraform apply

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name angel-investing-cluster
```

### 3. Deploy Application

```bash
# Deploy with Helm
cd k8s/charts/angel-investing-marketplace
helm dependency update
helm upgrade --install angel-investing-marketplace . \
  --namespace angel-investing-marketplace \
  --create-namespace \
  --values values-production.yaml
```

### 4. Verify Deployment

```bash
# Check deployment status
kubectl rollout status deployment/backend -n angel-investing-marketplace
kubectl rollout status deployment/frontend -n angel-investing-marketplace

# Run health checks
curl https://api.angelinvesting.market/health
curl https://app.angelinvesting.market/health
```

## 📋 Prerequisites

### Required Tools

- **Terraform** >= 1.5.0
- **Kubernetes** CLI (kubectl) >= 1.28
- **Helm** >= 3.0
- **AWS CLI** >= 2.0
- **Docker** >= 20.0
- **Git**

### AWS Requirements

- **IAM User** with appropriate permissions
- **Route53** hosted zone for your domain
- **SSL Certificate** (ACM or Let's Encrypt)

### Domain & DNS

- Domain name (e.g., `angelinvesting.market`)
- Route53 hosted zone configured
- SSL certificate issued

## 🏗️ Infrastructure Setup

### 1. AWS Configuration

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity
```

### 2. Terraform Deployment

```bash
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Review changes
terraform plan -var="environment=production"

# Deploy infrastructure
terraform apply -var="environment=production"
```

**Expected Infrastructure:**
- ✅ VPC with public/private subnets
- ✅ EKS cluster with managed node groups
- ✅ RDS PostgreSQL with encryption
- ✅ ElastiCache Redis cluster
- ✅ S3 bucket for file storage
- ✅ CloudFront CDN distribution
- ✅ Route53 DNS records

### 3. Kubernetes Configuration

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name angel-investing-cluster

# Verify cluster access
kubectl get nodes
kubectl get namespaces
```

## 🚢 Application Deployment

### 1. Secrets Management

**Option A: Using Docker Secrets (Local Development)**
```bash
cd docker/secrets
# Generate strong passwords
openssl rand -hex 32 > jwt_secret.txt
openssl rand -hex 16 > encryption_key.txt
openssl rand -alnum 32 > postgres_password.txt
openssl rand -alnum 32 > redis_password.txt
```

**Option B: Using AWS Secrets Manager (Production)**
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "prod/angel-investing/jwt-secret" \
  --secret-string "$(openssl rand -hex 32)"

aws secretsmanager create-secret \
  --name "prod/angel-investing/db-password" \
  --secret-string "$(openssl rand -alnum 32)"
```

### 2. Docker Image Build & Push

```bash
# Build and push backend image
docker build -f docker/Dockerfile.backend -t angel-investing/backend:latest .
docker push angel-investing/backend:latest

# Build and push frontend image
docker build -f docker/Dockerfile.frontend -t angel-investing/frontend:latest .
docker push angel-investing/frontend:latest
```

### 3. Helm Deployment

```bash
cd k8s/charts/angel-investing-marketplace

# Update dependencies
helm dependency update

# Deploy application
helm upgrade --install angel-investing-marketplace . \
  --namespace angel-investing-marketplace \
  --create-namespace \
  --set backend.image.tag=latest \
  --set frontend.image.tag=latest \
  --values values-production.yaml \
  --wait \
  --timeout 10m
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n angel-investing-marketplace

# Check service status
kubectl get services -n angel-investing-marketplace

# Check ingress
kubectl get ingress -n angel-investing-marketplace

# View logs
kubectl logs -f deployment/backend -n angel-investing-marketplace
kubectl logs -f deployment/frontend -n angel-investing-marketplace
```

## 📊 Monitoring & Observability

### Access Points

- **Grafana Dashboard:** https://grafana.angelinvesting.market
- **Prometheus:** http://prometheus.angelinvesting.market
- **Application Health:** https://api.angelinvesting.market/health

### Key Metrics to Monitor

1. **Application Metrics**
   - Response times (P95, P99)
   - Error rates (4xx, 5xx)
   - Throughput (requests/second)
   - Active users

2. **Infrastructure Metrics**
   - CPU/Memory utilization
   - Database connections
   - Redis memory usage
   - Network I/O

3. **Business Metrics**
   - User registrations
   - Investment transactions
   - Platform activity

### Alert Configuration

```bash
# Check active alerts
kubectl get prometheusrules -n angel-investing-marketplace

# View alertmanager status
kubectl port-forward svc/prometheus-alertmanager 9093:9093 -n angel-investing-marketplace
```

## 🔒 Security Configuration

### SSL/TLS Setup

**Automatic (Let's Encrypt)**
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Issue certificate
kubectl apply -f k8s/base/cluster-issuer.yml
```

**Manual (AWS ACM)**
```bash
# Update Terraform variables
terraform apply -var="ssl_certificate_arn=arn:aws:acm:us-east-1:123456789012:certificate/xxxx"
```

### Security Best Practices

✅ **Completed:**
- Non-root containers
- Security context enforcement
- Network policies
- Secrets encryption
- SSL/TLS termination
- Security headers

🔄 **Ongoing:**
- Regular security scanning
- Dependency updates
- Access review
- Log monitoring

### Compliance

- **SOC 2:** Audit logging enabled
- **GDPR:** Data encryption at rest/transit
- **PCI DSS:** Payment data protection
- **ISO 27001:** Security controls implemented

## 💾 Backup & Recovery

### Automated Backups

```bash
# Database backups (RDS)
aws rds describe-db-snapshots --db-instance-identifier angel-investing-postgres

# EBS volume snapshots
kubectl get volumesnapshots

# S3 bucket versioning
aws s3api list-object-versions --bucket angel-investing-files-production
```

### Recovery Procedures

**Database Recovery:**
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier angel-investing-postgres-recovery \
  --db-snapshot-identifier angel-investing-postgres-snapshot
```

**Application Recovery:**
```bash
# Rollback deployment
helm rollback angel-investing-marketplace --namespace angel-investing-marketplace

# Scale down problematic version
kubectl scale deployment backend --replicas=0 -n angel-investing-marketplace
```

## 🔧 Troubleshooting

### Common Issues

**1. Pod Failures**
```bash
# Check pod events
kubectl describe pod <pod-name> -n angel-investing-marketplace

# View pod logs
kubectl logs <pod-name> -n angel-investing-marketplace --previous
```

**2. Service Connectivity**
```bash
# Test service endpoints
kubectl port-forward svc/backend-service 3001:3001 -n angel-investing-marketplace
curl http://localhost:3001/health

# Check DNS resolution
nslookup api.angelinvesting.market
```

**3. Resource Issues**
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n angel-investing-marketplace

# Scale resources
kubectl scale deployment backend --replicas=5 -n angel-investing-marketplace
```

### Debug Commands

```bash
# Full cluster status
kubectl get all,ingress,secrets,configmap -n angel-investing-marketplace

# Network policies
kubectl get networkpolicies -n angel-investing-marketplace

# Persistent volumes
kubectl get pv,pvc -n angel-investing-marketplace

# Certificate status
kubectl get certificates -n angel-investing-marketplace
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale deployments
kubectl scale deployment backend --replicas=10 -n angel-investing-marketplace
kubectl scale deployment frontend --replicas=20 -n angel-investing-marketplace

# Enable autoscaling
kubectl autoscale deployment backend --cpu-percent=70 --min=3 --max=20 -n angel-investing-marketplace
```

### Vertical Scaling

```bash
# Update resource limits
kubectl patch deployment backend -n angel-investing-marketplace -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"requests":{"memory":"1Gi","cpu":"500m"},"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}}'
```

### Database Scaling

```bash
# Scale RDS instance
aws rds modify-db-instance \
  --db-instance-identifier angel-investing-postgres \
  --db-instance-class db.t3.large \
  --apply-immediately

# Enable read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier angel-investing-postgres-replica \
  --source-db-instance-identifier angel-investing-postgres
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The deployment pipeline includes:

1. **Security Scanning**
   - Code vulnerability scanning
   - Dependency checks
   - Container image scanning

2. **Automated Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests

3. **Docker Build & Push**
   - Multi-stage builds
   - Image optimization
   - Registry push

4. **Kubernetes Deployment**
   - Rolling updates
   - Health checks
   - Rollback capability

5. **Post-deployment Verification**
   - Health checks
   - Smoke tests
   - Performance validation

### Manual Deployment

```bash
# Trigger deployment
gh workflow run deploy.yml --ref main

# Monitor deployment
gh run watch <run-id>
```

## 📞 Support & Maintenance

### Regular Tasks

**Daily:**
- Monitor application health
- Check error rates
- Review security events

**Weekly:**
- Review resource utilization
- Update dependencies
- Backup verification

**Monthly:**
- Security patching
- Performance optimization
- Cost optimization

### Emergency Contacts

- **DevOps Team:** devops@angelinvesting.market
- **Security Team:** security@angelinvesting.market
- **Support:** support@angelinvesting.market

### Escalation Procedures

1. **P0 (Critical):** Immediate response required
2. **P1 (High):** Response within 1 hour
3. **P2 (Medium):** Response within 4 hours
4. **P3 (Low):** Response within 24 hours

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

**Last Updated:** October 2024
**Version:** 1.0.0
**Environment:** Production