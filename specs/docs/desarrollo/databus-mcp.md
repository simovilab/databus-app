# Model Context Protocol (MCP)

## Introduction

The Model Context Protocol (MCP) is an open standard that provides a unified framework for AI models to seamlessly connect with external data sources, tools, and services in real-time. 

With MCP, AI systems can:
- Read and act on live data from local or remote sources.
- Integrate with productivity tools, development platforms, and APIs.
- Adapt dynamically to new tools without requiring code changes.
- Maintain security and user control through permission-based access.

---

## Core Architecture

MCP uses a **client–server model**:

- **Host** – Runs the AI model, manages workflows, security, and user interaction.  
- **Client** – Inside the Host, connects to MCP servers.  
- **Server** – Offers tools/resources, executes requests, and returns results.  
Servers can be local or cloud-based, and multiple servers can run at once.

This modular design allows adding or replacing servers without modifying the Host’s core.

---

## How It Works

MCP relies on **JSON-RPC 2.0** for communication between Clients and Servers:

1. Server links to an external resource (e.g., API, database).
2. Client detects and connects to the server.
3. AI sends a request; server executes and returns data.


--- 
## Use Case: Databus Integration

By integrating MCP with the **Databus API**, users can query the public transport system naturally, with questions such as:

- Which buses stop here?
- Where is bus L1 currently?
- When is the next bus to Faculty of Law arriving?
- What is the current occupancy status of a bus?

These queries are answered automatically using real-time data retrieved from the Databus backend.

---


## Query Workflow

1. The LLM (Claude, GPT, etc.) receives a user query in natural language.  
2. MCP converts the query into API parameters (e.g., `stop_id`, `timestamp`).  
3. The Databus API returns real-time data.  
4. The LLM generates a user-friendly response.

Thanks to the model’s multilingual capabilities, queries in languages like French or Japanese are supported.

---

## Server Implementation

The Databus MCP server is implemented in Python using the official MCP SDK (`mcp` package) and the asynchronous HTTP client library `httpx`. The server functions as a bridge between the AI language model and the real-time Databus API, exposing various MCP tools that correspond to the GTFS data domains. It manages:

- Parsing and validating incoming requests from the MCP client.
- Querying the Databus API endpoints in real time.
- Formatting and returning structured data back to the client.

### Key Components

- **FastMCP server**: The server is instantiated using `FastMCP` from the MCP SDK, which provides an asynchronous, lightweight MCP server framework.
  
- **Async API requests**: All requests to the Databus API are made asynchronously using `httpx.AsyncClient`, allowing efficient handling of concurrent queries without blocking.

- **User-Agent and headers**: Requests include a custom `User-Agent` and accept JSON responses, ensuring proper communication with the Databus backend.

---

## MCP Tools Implemented

To facilitate interaction between the AI model and the Databus API, several MCP tools are implemented. These tools correspond to key GTFS domains and act as bridges that translate model queries into API calls:

| GTFS Domain              | MCP Tool Name        | API Endpoint(s)                          | Description                         |
|--------------------------|---------------------|-----------------------------------------|-----------------------------------|
| Stops                    | `get_stops`          | `/stops/`                              | Location, accessibility           |
| Routes                   | `get_routes`         | `/routes/`                             | Code, color, name                 |
| Next Trips               | `get_next_trips`     | `/next-trips/`                        | Arrival time, route, progress    |
| Operating Agency         | `get_agency`         | `/agency/`                            | Contact and customer service      |
| Service Calendar         | `get_calendar`       | `/calendar/`                          | Active days, holidays             |
| Fares                    | `get_fares`          | `/fare-rules/`, `/fare-attributes/`  | Payment methods, costs            |
| Geospatial Data          | `get_maps`           | `/geo-shapes/`, `/geo-stops/`         | Route and stop maps               |

### Example: `get_next_trips`

One of the  MCP tools is `get_next_trips`. It receives a GTFS stop ID and a timestamp (in ISO 8601 format) and queries the Databus API’s `/next-trips/` endpoint. The tool performs the following:

1. Constructs the API URL and parameters based on input.  
2. Makes an asynchronous GET request to retrieve upcoming trips.  
3. Handles possible errors gracefully, returning descriptive error messages.  
4. Parses the response and formats the next bus arrivals into a human-readable text string.  
5. Limits output to the first four arrivals for clarity.

---

## Additional Information and Codebase

The server codebase is open source and available at the following repository:  
[https://github.com/simovilab/infobus-mcp/tree/main/server](https://github.com/simovilab/infobus-mcp/tree/main/server)

