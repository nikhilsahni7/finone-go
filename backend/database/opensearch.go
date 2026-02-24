package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"finone-search-system/config"

	opensearch "github.com/opensearch-project/opensearch-go/v3"
	"github.com/opensearch-project/opensearch-go/v3/opensearchapi"
)

// OpenSearchAPI is the global OpenSearch API client used by services
var OpenSearchAPI *opensearchapi.Client

// OpenSearchIndices holds the list of indices to search across
var OpenSearchIndices []string

func InitOpenSearch() error {
	cfg := config.AppConfig

	if cfg.OpenSearch.Endpoint == "" {
		return fmt.Errorf("OPENSEARCH_ENDPOINT is not configured")
	}

	log.Printf("Connecting to OpenSearch at %s ...", cfg.OpenSearch.Endpoint)

	clientCfg := opensearch.Config{
		Addresses: []string{cfg.OpenSearch.Endpoint},
	}
	if cfg.OpenSearch.MasterUser != "" {
		clientCfg.Username = cfg.OpenSearch.MasterUser
		clientCfg.Password = cfg.OpenSearch.MasterPass
	}

	apiClient, err := opensearchapi.NewClient(opensearchapi.Config{
		Client: clientCfg,
	})
	if err != nil {
		return fmt.Errorf("failed to create OpenSearch client: %w", err)
	}

	// Verify connectivity with a ping
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = apiClient.Info(ctx, nil)
	if err != nil {
		return fmt.Errorf("OpenSearch ping failed: %w", err)
	}

	OpenSearchAPI = apiClient
	OpenSearchIndices = cfg.OpenSearch.Indices

	log.Printf("Successfully connected to OpenSearch (indices: %v)", OpenSearchIndices)
	return nil
}

func CloseOpenSearch() error {
	// HTTP-based client – nothing to close
	return nil
}

// OpenSearchHealthCheck pings the cluster to verify connectivity
func OpenSearchHealthCheck() error {
	if OpenSearchAPI == nil {
		return fmt.Errorf("OpenSearch client is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := OpenSearchAPI.Info(ctx, nil)
	return err
}
