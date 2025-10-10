terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "angel-investing-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "angel-investing-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment   = var.environment
      Project       = "angel-investing-marketplace"
      ManagedBy     = "terraform"
      Owner         = "devops-team"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  name               = "angel-investing-vpc"
  cidr               = var.vpc_cidr
  azs                = data.aws_availability_zones.available.names
  private_subnets    = var.private_subnet_cidrs
  public_subnets     = var.public_subnet_cidrs
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"

  tags = {
    Environment = var.environment
  }
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"

  cluster_name    = "angel-investing-cluster"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      name           = "angel-investing-nodes"
      instance_types = var.node_instance_types
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      desired_size   = var.node_desired_size

      labels = {
        Environment = var.environment
        NodeGroup   = "main"
      }

      tags = {
        Environment = var.environment
      }
    }
  }

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = {
    Environment = var.environment
  }
}

# RDS PostgreSQL
module "rds" {
  source = "./modules/rds"

  identifier = "angel-investing-postgres"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  multi_az               = var.environment == "production"
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.vpc.database_security_group_id]

  maintenance_window              = "sun:03:00-sun:04:00"
  backup_window                  = "02:00-03:00"
  backup_retention_period        = var.environment == "production" ? 30 : 7
  copy_tags_to_snapshot         = true
  deletion_protection           = var.environment == "production"
  final_snapshot_identifier     = "angel-investing-postgres-final-snapshot"
  skip_final_snapshot          = var.environment != "production"
  storage_encrypted            = true
  kms_key_id                  = aws_kms_key.rds.arn

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  monitoring_interval            = var.environment == "production" ? 30 : 60
  monitoring_role_arn           = aws_iam_role.rds_enhanced_monitoring.arn

  tags = {
    Environment = var.environment
  }
}

# ElastiCache Redis
module "redis" {
  source = "./modules/redis"

  cluster_id           = "angel-investing-redis"
  engine_version       = "7.0"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.environment == "production" ? 2 : 1
  parameter_group_name = "default.redis7"

  port              = 6379
  subnet_group_name = module.vpc.elasticache_subnet_group_name
  security_group_ids = [module.vpc.redis_security_group_id]

  maintenance_window                = "sun:03:00-sun:04:00"
  snapshot_window                  = "02:00-03:00"
  snapshot_retention_period        = var.environment == "production" ? 30 : 7
  final_snapshot_identifier       = "angel-investing-redis-final-snapshot"
  apply_immediately              = var.environment != "production"
  at_rest_encryption_enabled     = true
  transit_encryption_enabled     = true
  kms_key_id                    = aws_kms_key.redis.arn

  tags = {
    Environment = var.environment
  }
}

# S3 Bucket for file storage
module "s3" {
  source = "./modules/s3"

  bucket = "angel-investing-files-${var.environment}-${random_id.s3_suffix.hex}"
  acl    = "private"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        kms_master_key_id = aws_kms_key.s3.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }

  lifecycle_rule = [
    {
      id      = "transition_to_ia"
      enabled = true

      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
    }
  ]

  tags = {
    Environment = var.environment
  }
}

# CloudFront CDN
module "cloudfront" {
  source = "./modules/cloudfront"

  origin = {
    domain_name = module.s3.bucket_regional_domain_name
    origin_id   = "S3-${module.s3.bucket}"

    s3_origin_config = {
      origin_access_identity = "origin-access-identity/cloudfront/EXAMPLE"
    }
  }

  default_cache_behavior = {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${module.s3.bucket}"

    forwarded_values = {
      query_string = false
      headers      = ["Origin"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions = {
    geo_restriction = {
      restriction_type = "none"
    }
  }

  viewer_certificate = {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = {
    Environment = var.environment
  }
}

# Route53 DNS
module "route53" {
  source = "./modules/route53"

  domain_name = var.domain_name

  records = [
    {
      name = "api"
      type = "A"
      alias = {
        name                   = module.eks.cluster_endpoint
        zone_id               = module.eks.cluster_primary_security_group_id
        evaluate_target_health = true
      }
    },
    {
      name = "app"
      type = "A"
      alias = {
        name                   = module.eks.cluster_endpoint
        zone_id               = module.eks.cluster_primary_security_group_id
        evaluate_target_health = true
      }
    }
  ]
}

# KMS Keys for encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_key" "redis" {
  description             = "KMS key for Redis encryption"
  deletion_window_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Environment = var.environment
  }
}

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Environment = var.environment
  }
}

# Random passwords and IDs
resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "random_id" "s3_suffix" {
  byte_length = 4
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.cluster_configuration_endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = module.s3.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}