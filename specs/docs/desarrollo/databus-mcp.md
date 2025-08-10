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
