package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestAPIGet_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("expected GET, got %s", r.Method)
		}
		if r.URL.Path != "/api/events/test-id" {
			t.Errorf("expected /api/events/test-id, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":"test-id","name":"テストイベント"}`))
	}))
	defer ts.Close()

	t.Setenv("SOROU_API_BASE", ts.URL)
	body, err := apiGet("/api/events/test-id")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]string
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if result["id"] != "test-id" {
		t.Errorf("expected id=test-id, got %s", result["id"])
	}
}

func TestAPIGet_NotFound(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"not_found","message":"イベントが見つかりません"}`))
	}))
	defer ts.Close()

	t.Setenv("SOROU_API_BASE", ts.URL)
	_, err := apiGet("/api/events/nonexistent")
	if err == nil {
		t.Fatal("expected error for 404")
	}
	if !strings.Contains(err.Error(), "イベントが見つかりません") {
		t.Errorf("expected 'イベントが見つかりません' in error, got: %v", err)
	}
}

func TestAPIPost_Success(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", ct)
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		if payload["name"] != "テスト" {
			t.Errorf("expected name=テスト, got %v", payload["name"])
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"id":"abc123","name":"テスト","url":"http://example.com/e/abc123"}`))
	}))
	defer ts.Close()

	t.Setenv("SOROU_API_BASE", ts.URL)
	payload := map[string]any{"name": "テスト", "dates": []string{"6/1"}}
	body, err := apiPost("/api/events", payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result map[string]string
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if result["id"] != "abc123" {
		t.Errorf("expected id=abc123, got %s", result["id"])
	}
}

func TestAPIPost_ValidationError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"validation_error","message":"イベント名は必須です"}`))
	}))
	defer ts.Close()

	t.Setenv("SOROU_API_BASE", ts.URL)
	_, err := apiPost("/api/events", map[string]any{"name": ""})
	if err == nil {
		t.Fatal("expected error for 400")
	}
	if !strings.Contains(err.Error(), "イベント名は必須です") {
		t.Errorf("expected validation message, got: %v", err)
	}
}

func TestAPIURL_Default(t *testing.T) {
	os.Unsetenv("SOROU_API_BASE")
	os.Unsetenv("SOROU_API_URL")
	url := apiURL()
	if url != "" {
		t.Errorf("expected empty URL when not set, got %s", url)
	}
}

func TestAPIURL_CustomURL(t *testing.T) {
	t.Setenv("SOROU_API_BASE", "")
	t.Setenv("SOROU_API_URL", "http://localhost:8787")
	url := apiURL()
	if url != "http://localhost:8787" {
		t.Errorf("expected custom URL, got %s", url)
	}
}

func TestAPIURL_CustomBase(t *testing.T) {
	t.Setenv("SOROU_API_BASE", "http://localhost:8787")
	url := apiURL()
	if url != "http://localhost:8787" {
		t.Errorf("expected custom BASE URL, got %s", url)
	}
}

func TestAPIURL_BasePrecedence(t *testing.T) {
	// SOROU_API_BASE should take precedence over SOROU_API_URL
	t.Setenv("SOROU_API_BASE", "https://base.example.com")
	t.Setenv("SOROU_API_URL", "https://url.example.com")
	url := apiURL()
	if url != "https://base.example.com" {
		t.Errorf("expected SOROU_API_BASE to take precedence, got %s", url)
	}
}

func TestAPIURL_TrailingSlash(t *testing.T) {
	t.Setenv("SOROU_API_BASE", "https://example.com/")
	url := apiURL()
	if url != "https://example.com" {
		t.Errorf("expected URL without trailing slash, got %s", url)
	}
}

// Test that SOROU_API_BASE with trailing slash is trimmed before building paths.
func TestAPIPost_TrailingSlash(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Should not have double slash
		if strings.Contains(r.URL.Path, "//") {
			t.Errorf("double slash in path: %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{}`))
	}))
	defer ts.Close()

	t.Setenv("SOROU_API_BASE", ts.URL+"/")
	_, err := apiPost("/api/events", map[string]any{"name": "test", "dates": []string{"6/1"}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAPIURL_BaseWithURLFallback(t *testing.T) {
	// When SOROU_API_BASE is not set, SOROU_API_URL should be used
	os.Unsetenv("SOROU_API_BASE")
	t.Setenv("SOROU_API_URL", "https://fallback.example.com")
	url := apiURL()
	if url != "https://fallback.example.com" {
		t.Errorf("expected SOROU_API_URL fallback, got %s", url)
	}
}
