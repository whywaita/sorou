// sorou — CLI tool for the sorou schedule adjustment service.
//
// Usage:
//
//	sorou create           Create a new event (interactive)
//	sorou show <id>        Show event details (JSON)
//	sorou respond <id>     Submit/update a response (interactive)
//
// Environment:
//
//	SOROU_API_URL          API base URL (default: https://sorou.qh.nu)
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
	case "create":
		handleCreate()
	case "show":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "Error: event ID required")
			fmt.Fprintln(os.Stderr, "Usage: sorou show <id>")
			os.Exit(1)
		}
		handleShow(os.Args[2])
	case "respond":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "Error: event ID required")
			fmt.Fprintln(os.Stderr, "Usage: sorou respond <id>")
			os.Exit(1)
		}
		handleRespond(os.Args[2])
	case "help", "-h", "--help":
		printUsage()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", cmd)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println(`sorou — CLI for sorou schedule adjustment

Usage:
  sorou create           Create a new event (interactive)
  sorou show <id>        Show event details (JSON)
  sorou respond <id>     Submit/update a response (interactive)

Environment:
  SOROU_API_URL          API base URL (required)

Commands:
  create      Create a new event. Prompts for name, memo, and dates interactively.
  show        Display an event's details including candidates and responses as JSON.
  respond     Submit or update your attendance response. Prompts interactively.`)
}

// --- API client ---

func apiURL() string {
	if u := os.Getenv("SOROU_API_URL"); u != "" {
		return strings.TrimRight(u, "/")
	}
	return ""
}

func checkAPIURL() {
	if apiURL() == "" {
		fmt.Fprintln(os.Stderr, "Error: SOROU_API_URL environment variable is not set")
		fmt.Fprintln(os.Stderr, "  export SOROU_API_URL=https://your-sorou-instance.example.com")
		os.Exit(1)
	}
}

func apiGet(path string) ([]byte, error) {
	resp, err := http.Get(apiURL() + path)
	if err != nil {
		return nil, fmt.Errorf("HTTP GET %s: %w", path, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode >= 400 {
		var apiErr apiError
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Message != "" {
			return nil, fmt.Errorf("%s: %s", resp.Status, apiErr.Message)
		}
		return nil, fmt.Errorf("%s: %s", resp.Status, string(body))
	}

	return body, nil
}

func apiPost(path string, payload any) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	resp, err := http.Post(apiURL()+path, "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("HTTP POST %s: %w", path, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode >= 400 {
		var apiErr apiError
		if json.Unmarshal(respBody, &apiErr) == nil && apiErr.Message != "" {
			return nil, fmt.Errorf("%s: %s", resp.Status, apiErr.Message)
		}
		return nil, fmt.Errorf("%s: %s", resp.Status, string(respBody))
	}

	return respBody, nil
}

type apiError struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// --- Shared types ---

type eventResponse struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Memo      string          `json:"memo"`
	Dates     []dateEntry     `json:"dates"`
	Responses []responseEntry `json:"responses"`
	CreatedAt string          `json:"created_at"`
	URL       string          `json:"url"`
}

type dateEntry struct {
	ID   int    `json:"id"`
	Date string `json:"date"`
}

type responseEntry struct {
	ID              int           `json:"id"`
	ParticipantName string        `json:"participant_name"`
	Comment         string        `json:"comment"`
	Statuses        []statusEntry `json:"statuses"`
	CreatedAt       string        `json:"created_at"`
}

type statusEntry struct {
	CandidateID int    `json:"candidate_id"`
	Status      string `json:"status"`
}

// --- create ---

func handleCreate() {
	checkAPIURL()
	reader := bufio.NewReader(os.Stdin)

	fmt.Print("イベント名: ")
	name, _ := reader.ReadString('\n')
	name = strings.TrimSpace(name)
	if name == "" {
		fmt.Fprintln(os.Stderr, "Error: イベント名は必須です")
		os.Exit(1)
	}

	fmt.Print("メモ (任意): ")
	memo, _ := reader.ReadString('\n')
	memo = strings.TrimSpace(memo)

	fmt.Println("候補日時 (1行1候補、空行で終了):")
	var dates []string
	for {
		fmt.Print("> ")
		line, err := reader.ReadString('\n')
		if err != nil {
			break
		}
		line = strings.TrimSpace(line)
		if line == "" {
			break
		}
		dates = append(dates, line)
	}

	if len(dates) == 0 {
		fmt.Fprintln(os.Stderr, "Error: 候補日時が入力されていません")
		os.Exit(1)
	}

	payload := map[string]any{
		"name":  name,
		"memo":  memo,
		"dates": dates,
	}

	respBody, err := apiPost("/api/events", payload)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	var event eventResponse
	if err := json.Unmarshal(respBody, &event); err != nil {
		fmt.Fprintf(os.Stderr, "Error: parsing response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("\nイベントを作成しました！\n")
	fmt.Printf("  ID:    %s\n", event.ID)
	fmt.Printf("  URL:   %s\n", event.URL)
	fmt.Printf("  候補数: %d\n", len(event.Dates))
	for _, d := range event.Dates {
		fmt.Printf("    [%d] %s\n", d.ID, d.Date)
	}
}

// --- show ---

func handleShow(id string) {
	checkAPIURL()
	body, err := apiGet("/api/events/" + id)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Pretty-print the JSON
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, body, "", "  "); err != nil {
		fmt.Println(string(body))
		return
	}
	fmt.Println(pretty.String())
}

// --- respond ---

func handleRespond(eventID string) {
	checkAPIURL()
	// Fetch event to get candidate IDs
	body, err := apiGet("/api/events/" + eventID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	var event eventResponse
	if err := json.Unmarshal(body, &event); err != nil {
		fmt.Fprintf(os.Stderr, "Error: parsing event: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("イベント: %s\n", event.Name)
	if event.Memo != "" {
		fmt.Printf("メモ: %s\n", event.Memo)
	}
	fmt.Println()

	reader := bufio.NewReader(os.Stdin)

	fmt.Print("お名前: ")
	participantName, _ := reader.ReadString('\n')
	participantName = strings.TrimSpace(participantName)
	if participantName == "" {
		fmt.Fprintln(os.Stderr, "Error: お名前は必須です")
		os.Exit(1)
	}

	fmt.Print("コメント (任意): ")
	comment, _ := reader.ReadString('\n')
	comment = strings.TrimSpace(comment)

	fmt.Println("\n各候補日の出欠を選択してください:")
	fmt.Println("  〇=参加  △=微妙  ×=不参加")
	fmt.Println()

	var statuses []map[string]any
	for _, d := range event.Dates {
		for {
			fmt.Printf("  [%s] 〇/△/×: ", d.Date)
			choice, _ := reader.ReadString('\n')
			choice = strings.TrimSpace(choice)
			switch choice {
			case "〇", "○", "o", "O", "0":
				statuses = append(statuses, map[string]any{
					"candidate_id": d.ID,
					"status":       "〇",
				})
			case "△", "さんかく":
				statuses = append(statuses, map[string]any{
					"candidate_id": d.ID,
					"status":       "△",
				})
			case "×", "x", "X", "ばつ":
				statuses = append(statuses, map[string]any{
					"candidate_id": d.ID,
					"status":       "×",
				})
			default:
				fmt.Fprintln(os.Stderr, "  〇、△、× のいずれかを入力してください")
				continue
			}
			break
		}
	}

	payload := map[string]any{
		"participant_name": participantName,
		"comment":          comment,
		"statuses":         statuses,
	}

	respBody, err := apiPost("/api/events/"+eventID+"/responses", payload)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	var resp struct {
		ID              int    `json:"id"`
		ParticipantName string `json:"participant_name"`
		Updated         bool   `json:"updated"`
	}
	if err := json.Unmarshal(respBody, &resp); err != nil {
		fmt.Fprintf(os.Stderr, "Error: parsing response: %v\n", err)
		os.Exit(1)
	}

	action := "回答しました"
	if resp.Updated {
		action = "回答を更新しました"
	}
	fmt.Printf("\n%s！(%s)\n", action, resp.ParticipantName)
}
