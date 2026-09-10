# @itrix/widget

> Embeddable IT Helpdesk & Ticket Triage Floating Widget powered by AI RAG analysis.

`@itrix/widget` is an end-to-end, embeddable floating chat widget designed to let employees raise IT tickets and view past ticket history directly from any website or React web application. It connects securely to the ITrix AI Triage Engine to instantly answer questions using internal company documentation or route unresolved issues to human IT teams.

🌐 **Live Platform Instance:** [https://itrixai.vercel.app](https://itrixai.vercel.app)

---

## Features

- 💬 **Floating Launcher Button:** Positioned cleanly at the bottom-right corner of the viewport.
- 🤖 **AI-Powered Instant Answers:** Searches company documentation using RAG to suggest immediate resolutions with citations.
- 📋 **Ticket History:** Lets employees view their past submitted tickets, category routing, and resolution status badges (`auto_resolved`, `needs_verification`, `needs_review`, `pending`).
- 🔐 **HMAC Identity Verification:** Securely authenticates employee identity using HMAC-SHA256 signatures derived from your organization's secret.
- 🎨 **Theme Customization:** Easily match host application colors (background, accent/foreground, text).
- 🛡️ **Shadow DOM Isolation (Script Embed):** Prevents host CSS styles from conflicting with widget styling.

---

## Installation

```bash
npm install @itrix/widget
# or
yarn add @itrix/widget
# or
pnpm add @itrix/widget
```

---

## Usage

### Option 1: React / Next.js Component

Import `<TicketWidget />` directly into your React application tree:

```tsx
import React from "react";
import { TicketWidget } from "@itrix/widget";

export default function App() {
  // Compute HMAC signature on your backend server using your organization HMAC secret:
  // HMAC-SHA256(hmac_secret, `${employeeId}:${employeeEmail}`)
  const employeeSignature = "computed_hmac_sha256_signature";

  return (
    <div className="min-h-screen">
      <h1>Internal Employee Portal</h1>

      <TicketWidget
        widgetKey="wpk_live_your_public_widget_key"
        apiUrl="https://itrixai.vercel.app"
        employee={{
          id: "emp_1042",
          email: "alex@company.com",
          signature: employeeSignature,
        }}
        theme={{
          background: "#0F172A",
          foreground: "#10B981",
          text: "#FFFFFF",
        }}
      />
    </div>
  );
}
```

---

### Option 2: Script-Tag Embed (Vanilla HTML / WordPress / Any Web Framework)

For non-React host sites or static web pages, embed the standalone script bundle directly into your HTML:

```html
<script 
  src="https://itrixai.vercel.app/widget/v1/widget.js"
  data-widget-key="wpk_live_your_public_widget_key"
  data-employee-id="emp_1042"
  data-employee-email="alex@company.com"
  data-signature="computed_hmac_sha256_signature"
  data-api-url="https://itrixai.vercel.app"
  data-bg-color="#0F172A"
  data-fg-color="#10B981"
  data-text-color="#FFFFFF"
  async
></script>
```

The script bundle automatically creates a Shadow DOM root at the bottom of the page and mounts the widget without interfering with host page styles.

---

## Props Reference (`TicketWidgetProps`)

| Prop | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `widgetKey` | `string` | **Yes** | — | Public organization widget key (`wpk_live_...`). |
| `employee.id` | `string` | **Yes** | — | Employee ID within host organization. |
| `employee.email` | `string` | **Yes** | — | Employee work email address. |
| `employee.signature` | `string` | **Yes** | — | HMAC-SHA256 signature verifying employee identity. |
| `apiUrl` | `string` | No | `"https://itrixai.vercel.app"` | Base URL of the ITrix server endpoint. |
| `theme.background` | `string` | No | `"#0F172A"` | Card background color (hex/rgb/hsl). |
| `theme.foreground` | `string` | No | `"#10B981"` | Launcher button and primary accent color. |
| `theme.text` | `string` | No | `"#FFFFFF"` | Primary text color. |

---

## Generating HMAC Signatures

To prevent unauthorized users from submitting tickets or viewing another employee's tickets, every request must be signed with an HMAC-SHA256 signature generated on **your backend server**.

### Node.js Example

```js
const crypto = require('crypto');

function generateEmployeeSignature(employeeId, employeeEmail, hmacSecret) {
  const message = `${employeeId}:${employeeEmail}`;
  return crypto
    .createHmac('sha256', hmacSecret)
    .update(message)
    .digest('hex');
}

// Example usage:
const signature = generateEmployeeSignature(
  'emp_1042',
  'alex@company.com',
  process.env.ITRIX_HMAC_SECRET
);
```

### Python Example

```python
import hmac
import hashlib

def generate_employee_signature(employee_id: str, employee_email: str, hmac_secret: str) -> str:
    message = f"{employee_id}:{employee_email}".encode('utf-8')
    secret = hmac_secret.encode('utf-8')
    return hmac.new(secret, message, hashlib.sha256).hexdigest()
```

---

## License

[MIT](LICENSE) © ITrix Team
