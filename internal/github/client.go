// internal/github/client.go
// GitHub API client — injects auth token, returns raw JSON
package github

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

const baseURL = "https://api.github.com"

type Client struct {
	token      string
	httpClient *http.Client
}

func NewClient(token string) *Client {
	return &Client{
		token: token,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) get(path string) ([]byte, int, error) {
	req, err := http.NewRequest("GET", baseURL+path, nil)
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	// Inject token if provided — bumps rate limit from 60 to 5000 req/hr
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	return body, resp.StatusCode, nil
}

func (c *Client) GetUser(username string) ([]byte, int, error) {
	return c.get(fmt.Sprintf("/users/%s", username))
}

func (c *Client) GetRepos(username string) ([]byte, int, error) {
	return c.get(fmt.Sprintf("/users/%s/repos?sort=stars&per_page=100", username))
}

func (c *Client) GetEvents(username string) ([]byte, int, error) {
	return c.get(fmt.Sprintf("/users/%s/events/public?per_page=30", username))
}
