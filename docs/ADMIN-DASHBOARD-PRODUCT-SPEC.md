# Admin Dashboard Product Specification

**Product:** Pharmacy & Warehouse Distribution Management System  
**Audience:** UI/UX design and Figma Make  
**Status:** Analysis of the current repository. This document does not choose a visual direction.  
**Requirements update, 5 November 2026:** Server-side paging and search, a required product image in Amazon S3, and server-side sign-out are now version-1 requirements. They are not implemented in the API yet. See section 16.  
**Sources:** `docs/srs-en.md`, `docs/timeline-and-financial-proposal.md`, `docs/ARCHITECTURE/BACKEND_ARCHITECTURE.md`, `backend/prisma/schema.prisma`, and the NestJS admin API under `backend/src`.

## How to read evidence labels

| Label | Meaning |
| --- | --- |
| **Verified** | Confirmed in the current backend or in the project SRS. |
| **Inferred** | Strongly suggested by the implementation, but not stated as a product decision. |
| **Missing** | Needed to operate the dashboard, and not present in the current API or schema behavior. |
| **Proposed** | A design recommendation. It is not an implemented screen, route, or endpoint. |

There is no admin frontend in this repository. Every screen below is **Proposed**. API paths, fields, and rules cited from controllers, DTOs, services, or the schema are **Verified** unless marked otherwise.

---

## 1. Product overview

### 1.1 Purpose

**Verified.** The system distributes national medicines, foreign medicines, and accessories from warehouses to pharmacies. It is the intermediary for products, stock, orders, invoices, driver assignment, collection, and outstanding debts (`docs/srs-en.md`, sections 1.1 and 18).

The operating rule is: **an order groups invoices; stock, delivery, collection, and delivery status are managed on each invoice.** The parent order status is calculated from its invoices. It is not stored and it is not edited by hand (`backend/src/modules/order/helpers/derive-order-status.helper.ts`).

### 1.2 Role of the Admin Dashboard

**Verified.** The dashboard is one of three clients:

| Client | Who uses it | What it does |
| --- | --- | --- |
| Admin Dashboard | Administrator | Pharmacies, drivers, products, warehouses, orders, invoices, stock, accounts, reports |
| Pharmacy mobile app | Registered pharmacy | Sign in, browse, submit orders, track invoices |
| Driver mobile app | Registered driver | See assigned invoices and record delivery and collection |

Warehouses have no account and no app. The administrator types stock quantities after receiving them from warehouse owners (`docs/srs-en.md`, section 1.3).

### 1.3 Intended users

| User | Evidence | Responsibility in the dashboard |
| --- | --- | --- |
| System administrator | **Verified.** `AccountRole.ADMIN`. One bootstrap account is created from configuration when that mobile number is unused (`backend/src/modules/user/user.service.ts`). | Every admin endpoint. |
| Admin staff with finer permissions | **Verified as deferred.** SRS says permissions “will be defined later” and the system must allow them later without a rebuild. The code has no staff role and no permission table. | None today. |
| Pharmacy | **Verified.** `AccountRole.PHARMACY`. | Cannot call admin routes. |
| Driver | **Verified.** `AccountRole.DRIVER`. | Cannot call admin routes. Records delivery in the driver app, which the dashboard then reviews. |
| Warehouse owner | **Verified.** No account. | Not a dashboard user. |

### 1.4 Problems the dashboard solves

**Verified** from the SRS acceptance criteria and the admin controllers:

- Register warehouses, manufacturers, and products, including prices in USD and Syrian pounds, one exchange rate, offers, and order limits.
- Record warehouse quantities by hand and choose one primary warehouse per product.
- Open pharmacy and driver sign-in accounts.
- Review each submitted invoice, approve or reject it independently, and reserve stock only on approval.
- Assign an approved invoice to an active driver, and send a returned invoice out again.
- Record a receipt that pays whole unpaid invoices, and record money a driver hands to the administration.
- Read sales, stock, debt, and driver reports.
- See in-app notifications and the audit rows for stock, invoice status, and payments.

### 1.5 Main entities

| Entity | Meaning | Where it lives |
| --- | --- | --- |
| User | Sign-in account. Role is `ADMIN`, `PHARMACY`, or `DRIVER`. Password is stored only as `passwordHash`. | `users` |
| Pharmacy | Customer that orders. Linked to one user. | `pharmacies` |
| Driver | Person who delivers. Linked to one user. | `drivers` |
| Manufacturer | Selected on a product. Not free text. | `manufacturers` |
| Warehouse | Named location with an address. No login. | `warehouses` |
| Product | Medicine or accessory. | `products` |
| Product stock | Quantity of one product in one warehouse, with reserved quantity and one primary flag. | `product_stocks` |
| Exchange rate | Single USD-to-SYP rate. Row id is fixed at 1. | `exchange_rates` |
| Order | One pharmacy submission. Status is derived. | `orders` |
| Invoice | One category inside an order. | `invoices` |
| Invoice item | Prices, quantities, offer, and primary warehouse captured at submission. | `invoice_items` |
| Rejection reason | Managed label used when rejecting. | `rejection_reasons` |
| Delivery assignment | One invoice given to one driver. | `delivery_assignments` |
| Delivery event | Append-only delivery result. | `delivery_events` |
| Payment | Receipt or driver collection. | `payments` |
| Payment allocation | Whole-invoice coverage in one currency. Unique per invoice and currency. | `payment_allocations` |
| Driver settlement | Handover of whole collections. | `driver_settlements` |
| Return record | One row per invoice. Prevents returning the same quantity twice. | `return_records` |
| Notification | In-app message for admin, pharmacy, or driver. | `notifications` |
| Audit entry | Append-only stock, invoice-status, or payment event. | `audit_entries` |

---

## 2. Architecture relevant to the dashboard

**Verified.**

| Fact | Detail |
| --- | --- |
| Backend | NestJS application in `backend/`. Composition root is `backend/src/app.module.ts`. |
| Admin API module | `backend/src/modules/admin-api.module.ts` registers every admin controller. |
| Route prefix | Admin controllers use paths beginning with `admin/`. Swagger names this audience `admin`, path prefix `/admin`, JSON at `docs/admin-json` (`backend/src/providers/swagger/swagger-document.definitions.ts`). |
| Auth | `POST /admin/auth/sign-in` returns a Bearer access token. Later calls send `Authorization: Bearer`. Guards are `JwtAuthGuard` then `RolesGuard`. Class-level role is `AccountRole.ADMIN`. |
| Database | PostgreSQL through Prisma. Schema: `backend/prisma/schema.prisma`. Domain tables exist in that schema. The init migration is only a platform comment; later migrations add domain tables. |
| Other clients | `pharmacy-api.module.ts` and `driver-api.module.ts`. The dashboard must not call those routes. |
| Frontend | No admin web application, routes, or components exist in the repository. |
| External services | No payment gateway, maps, SMS, or push provider is wired for the dashboard. Notifications are rows in `notifications`. The product has an optional `imageUrl` string. Amazon S3 is now required for the product image and is not wired yet. |

**Inferred.** The architecture document describes audience-scoped APIs and is an engineering template. The running admin surface is the controller list in section 9, not every folder sketched in that template.

---

## 3. User roles and permissions

### 3.1 Implemented role

**Verified.** The only administrative role is `ADMIN`. Every admin controller is decorated with `@Roles(AccountRole.ADMIN)`. A pharmacy or driver token receives access denied. There is no second admin role, no permission list, and no per-screen grant.

| Capability | Administrator |
| --- | --- |
| View | All admin read endpoints in section 9. Cannot read another audience’s private routes. |
| Create | Warehouse, manufacturer, product, pharmacy account, driver account, rejection reason, receipt, delivery assignment, return, driver settlement. |
| Edit | Product fields, warehouse name and address, manufacturer name, exchange rate, rejection-reason label, one warehouse quantity, the full stock set, the primary warehouse, product availability and record status. |
| Deactivate | Pharmacy account, driver account, manufacturer, rejection reason, product (`status` on the product update). These are status changes, not deletes. |
| Delete | No admin delete endpoint was found. Several tables have `deletedAt`, but the dashboard has no delete action to call. |
| Extra authorization | None. The signed-in admin is enough. Destructive actions are not gated by a second approver. |
| Cannot | Sign in as pharmacy or driver from the admin auth route. Link an admin user to a pharmacy or driver. Edit an order after submission. Record a delivery result (the driver app does that). Pay part of an invoice. See or return `passwordHash`. |

### 3.2 Not implemented

| Topic | Status |
| --- | --- |
| Admin staff and permission matrix | **Missing.** SRS defers it. |
| Separate “view only” administrator | **Missing.** |
| Confirmation step enforced by the server | **Missing.** Confirmation is a UI concern only. |
| Admin password change, reset, or session revoke | **Missing.** Pharmacy single-device sessions do not apply to admin. |
| Editing a pharmacy name, mobile number, address, or password after creation | **Missing.** |
| Editing a driver name, mobile number, or password after creation | **Missing.** |

---

## 4. Information architecture

**Proposed** navigation, grouped by the tasks the API actually supports. Routes below are UI paths for the future app. They are not implemented.

```
Sign in
Shell
├── Home                         composed overview
├── Orders
│   ├── Order list
│   └── Order detail
│       └── Invoice review      approve, reject, assign, send out again
├── Returns                      action on an invoice already known by id
├── Catalog
│   ├── Products
│   ├── Warehouses
│   └── Manufacturers
├── Accounts
│   ├── Pharmacies
│   │   ├── Profile
│   │   ├── Statement
│   │   └── Record receipt
│   └── Drivers
│       ├── Profile
│       └── Settlement
├── Reports
│   ├── Sales
│   ├── Products and stock
│   ├── Debts
│   └── Drivers
├── Notifications
└── Settings
    ├── Exchange rate
    └── Rejection reasons
```

### 4.1 Why this grouping

- Orders are the daily queue. Invoice actions stay on the order, because approval, rejection, assignment, and redelivery are per invoice and the list API returns the parent order.
- Catalog is separate because week-one work is product setup and it does not depend on a live order.
- Money stays under the pharmacy or driver that owns it. A receipt needs a pharmacy id. A handover needs a driver id. There is no global payments inbox.
- Reports are read-only and should not be mixed with data entry.
- Exchange rate and rejection reasons are settings used by many screens, not catalog records.

### 4.2 Cross-navigation

| From | To | Why |
| --- | --- | --- |
| Notification `ORDER_SUBMITTED` | Order detail | `resourceType` is `order`, `resourceId` is the order id. |
| Notification about an invoice | Invoice inside its order | Admin invoice API returns `orderId`. |
| Debt report unpaid row | Invoice and pharmacy statement | Response includes `invoiceId` and `pharmacyId`. |
| Driver report row | Driver settlement | Response includes `driverId`. |
| Warehouse product row | Product detail | Response includes `productId`. |
| Audit panel on a record | That record | Audit is queried by `resourceType` and `resourceId`, not as a global feed. |

### 4.3 Breadcrumbs

**Proposed** on detail screens only: Orders / Order {id} / Invoice {id}; Catalog / Products / {name}; Accounts / Pharmacies / {name} / Statement. List screens do not need them.

### 4.4 Global search

**Missing** as one box that searches every resource. **Required since 5 November 2026:** each growing list has its own server-side search and paging, specified in section 16. Sales reports already filter by `pharmacyId`, `category`, `from`, and `to`. Audit already filters by `resourceType` and `resourceId`.

### 4.5 Role differences

**Verified.** With one admin role, navigation does not change per user. **Proposed:** do not design a permission-based menu until staff roles exist.

---

## 5. Screen inventory

Status of every row: **Proposed** screen. “API” says whether a backend already supports it.

| Area | Screen | Proposed UI path | API support |
| --- | --- | --- | --- |
| Access | Sign in | `/sign-in` | **Verified** `POST /admin/auth/sign-in` |
| Shell | Signed-in frame, current admin, notification entry | all authenticated pages | **Verified** `GET /admin/auth/me` |
| Home | Operations overview | `/` | **Missing** aggregate endpoint. Can show the notification list and the order list only. |
| Orders | Order list | `/orders` | **Verified** `GET /admin/orders` returns every row. **Required:** server paging and search. Not implemented. |
| Orders | Order detail | `/orders/:orderId` | **Verified** `GET /admin/orders/:id` |
| Orders | Invoice review | `/orders/:orderId/invoices/:invoiceId` | **Verified** `GET /admin/invoices/:id` plus approve, reject, assign |
| Returns | Return to warehouse | action on invoice review | **Verified** `POST /admin/returns`. No list of returns. |
| Catalog | Product list | `/products` | **Verified** `GET /admin/products` returns every row. **Required:** server paging and search. Not implemented. |
| Catalog | Create product | `/products/new` | **Verified** `POST /admin/products` |
| Catalog | Edit product | `/products/:productId` | **Verified** `GET` and `PATCH /admin/products/:id` |
| Catalog | Warehouse quantities | section of the product screen | **Verified** `PUT .../stocks`, `PATCH .../stocks/:warehouseId`, `PATCH .../primary-warehouse` |
| Catalog | Warehouse list | `/warehouses` | **Verified** `GET /admin/warehouses` |
| Catalog | Warehouse detail | `/warehouses/:warehouseId` | **Verified** `GET`, `GET .../products`, `PATCH` |
| Catalog | Create warehouse | `/warehouses/new` | **Verified** `POST /admin/warehouses` |
| Catalog | Manufacturer list | `/manufacturers` | **Verified** `GET /admin/manufacturers` |
| Catalog | Manufacturer create and edit | `/manufacturers/new`, `/manufacturers/:id` | **Verified** `POST`, `GET`, `PATCH`, `PATCH .../status` |
| Accounts | Pharmacy create | `/pharmacies/new` | **Verified** `POST /admin/pharmacies` |
| Accounts | Pharmacy list | `/pharmacies` | **Missing** list endpoint. |
| Accounts | Pharmacy profile | `/pharmacies/:pharmacyId` | **Verified** `GET /admin/pharmacies/:id` and `PATCH .../status` |
| Accounts | Pharmacy statement | `/pharmacies/:pharmacyId/statement` | **Verified** `GET .../statement` |
| Accounts | Record receipt | `/pharmacies/:pharmacyId/receipts/new` | **Verified** `POST /admin/receipts`. No receipt history endpoint. |
| Accounts | Driver create | `/drivers/new` | **Verified** `POST /admin/drivers` |
| Accounts | Driver list | `/drivers` | **Missing** list endpoint. |
| Accounts | Driver profile | `/drivers/:driverId` | **Verified** `GET /admin/drivers/:id` and `PATCH .../status` |
| Accounts | Driver settlement | `/drivers/:driverId/settlement` | **Verified** `GET /admin/drivers/:driverId/settlement` and `POST /admin/driver-settlements` |
| Reports | Sales | `/reports/sales` | **Verified** `GET /admin/reports/sales` |
| Reports | Products and stock | `/reports/products` | **Verified** `GET /admin/reports/products` |
| Reports | Debts | `/reports/debts` | **Verified** `GET /admin/reports/debts` |
| Reports | Drivers | `/reports/drivers` | **Verified** `GET /admin/reports/drivers` |
| Ops | Notifications | `/notifications` | **Verified** `GET /admin/notifications`, `POST /admin/notifications/:id/read` |
| Ops | Audit on a record | panel, not a global page | **Verified** `GET /admin/audit?resourceType&resourceId` |
| Settings | Exchange rate | `/settings/exchange-rate` | **Verified** `GET` and `PUT /admin/exchange-rate` |
| Settings | Rejection reasons | `/settings/rejection-reasons` | **Verified** full create, list, rename, status |

Screens that must not be invented: order cancel, order edit, partial payment, delivery proof photo, warehouse login, batch or expiry, admin delivery-result entry, staff permission editor, password reset.

---

## 6. Detailed screen specifications

Shared target role for every screen: **Verified** `ADMIN` only.

Shared list contract: **Verified** current list endpoints return the full array. **Required since 5 November 2026:** the lists in section 16 are paged and searched on the server. Design the table with a search field, filters, a page size, and a total count. Do not design a client-only search of a fully loaded list.

### 6.1 Sign in

| Item | Specification |
| --- | --- |
| Purpose | Exchange mobile number and password for an access token. |
| Fields | Mobile number, required, pattern `+` optional then 8–15 digits. Password, required, 8–128 characters. Password is write-only. |
| Actions | Submit. |
| Success | Store the Bearer token and `expiresIn`. Open the shell. Do not display the token. |
| Failure | Invalid credentials stay on the form. Do not reveal whether the mobile number exists. |
| API | `POST /admin/auth/sign-in`. Public. Response: `accessToken`, `tokenType` (`Bearer`), `expiresIn`. |
| Rule | **Verified.** First successful environment creates the bootstrap admin from server configuration. The UI does not collect that bootstrap password separately. |

### 6.2 Shell

| Item | Specification |
| --- | --- |
| Purpose | Persistent navigation, current administrator, and a way into notifications. |
| Data | `GET /admin/auth/me`: `id`, `role`, `mobileNumber`, `status`, `createdAt`, `updatedAt`. No name field and no password. |
| Actions | Navigate. Sign out calls the server, then discards the token. **Required** endpoint is not implemented. After sign-out, the same token is rejected. |
| Rule | If `status` is not `ACTIVE`, the API should already reject the token. **Inferred** from account-status checks elsewhere; the exact admin-disabled behavior was not separately traced. Treat a 401 as “session ended”. |

### 6.3 Home

| Item | Specification |
| --- | --- |
| Purpose | Show what needs attention without inventing metrics. |
| Show | Unread admin notifications. Newest orders from `GET /admin/orders`, using the fields already on that response. |
| Do not show | Charts of sales or debts unless the user opens Reports. Those numbers are period queries, not a home aggregate. |
| Empty | No orders yet, and no notifications. |

### 6.4 Order list

| Item | Specification |
| --- | --- |
| Purpose | Review every submitted pharmacy order. |
| Columns | Order id, pharmacy name, created date, invoice count, totals (one row can have both USD and SYP), derived status, and each invoice status. |
| Actions | Open order. |
| Filters | **Required:** server search by order number and pharmacy name, plus derived status and order date, applied before the page is cut. The current API does not do this yet. |
| Sort | **Required:** the server returns orders newest first. The current list endpoint does not guarantee that yet. |
| API | `GET /admin/orders`. |

Derived order status, **Verified**:

| Status | When |
| --- | --- |
| `PENDING` | No invoices, or every invoice is `PENDING`. |
| `COMPLETED` | Every invoice is `REJECTED`, `DELIVERED_PAID`, or `DELIVERED_UNPAID`. |
| `PARTIALLY_DELIVERED` | At least one invoice is in a delivery state, and the order is not completed. Delivery states are `ASSIGNED`, `DELIVERED_PAID`, `DELIVERED_UNPAID`, `NOT_DELIVERED`, `RETURNED_TO_WAREHOUSE`, `OUT_FOR_DELIVERY`. |
| `APPROVED` | Every invoice is `APPROVED`. |
| `PARTIALLY_APPROVED` | Anything else, including a mix of pending, approved, and rejected. |

`PARTIALLY_DELIVERED` is evaluated before `APPROVED`. A mix of approved and assigned invoices is `PARTIALLY_DELIVERED`, not `APPROVED`.

### 6.5 Order detail and invoice review

| Item | Specification |
| --- | --- |
| Purpose | See every category invoice and act on one invoice at a time. |
| Order header | Pharmacy id and name, derived status, invoice count, currency totals, created time. |
| Invoice summary | Id, category, status, totals, rejection label, custom reason. |
| Line items | Product name, barcode, sale unit, paid quantity, free quantity, total quantity, unit price, consumer unit price, currency, line amount, primary warehouse id, offer paid and free units. These values are a snapshot. Later product edits must not be shown as if they changed this invoice. |
| Actions on `PENDING` | Approve. Reject. |
| Actions on `APPROVED` | Assign to an active driver. |
| Actions on `RETURNED_TO_WAREHOUSE` | Assign again. The same assign endpoint sends it out for delivery and reserves stock again. |
| Actions on `NOT_DELIVERED` or `DELIVERED_UNPAID` | Return to warehouse, only if the invoice has no payment allocation. |
| No action | `REJECTED`, `ASSIGNED`, `OUT_FOR_DELIVERY`, `DELIVERED_PAID`. Delivery results are recorded by the driver, not here. |
| Reject form | Optional managed reason (active reasons only) and optional note up to 500 characters. Both may be empty. |
| Assign form | Driver id. The UI needs a driver picker. **Missing:** driver list API, so the picker cannot be filled from a verified endpoint. |
| APIs | `GET /admin/orders/:id`. `GET /admin/invoices/:id`. `POST /admin/invoices/:id/approve`. `POST /admin/invoices/:id/reject`. `POST /admin/deliveries` with `{ invoiceId, driverId }`. `POST /admin/returns` with `{ invoiceId }`. |

Invoice transitions the admin can cause, **Verified**:

| From | Action | To | Stock and money |
| --- | --- | --- | --- |
| `PENDING` | Approve | `APPROVED` | Reserve `totalQuantity` on the warehouse stored on each line. Fails with `INSUFFICIENT_STOCK` if available quantity is too low. |
| `PENDING` | Reject | `REJECTED` | No stock change. Pharmacy is notified. |
| `APPROVED` | Assign | `ASSIGNED` | Inactive driver returns `DRIVER_INACTIVE`. Pharmacy and driver are notified. |
| `RETURNED_TO_WAREHOUSE` | Assign again | `OUT_FOR_DELIVERY` | Reserves the line quantities again and reuses the assignment row. |
| `NOT_DELIVERED` | Return | `RETURNED_TO_WAREHOUSE` | Releases the reservation. One return row. |
| `DELIVERED_UNPAID` | Return | `RETURNED_TO_WAREHOUSE` | Adds the quantity back once. Fails if a payment allocation exists. |

Driver-caused transitions the dashboard only displays: `ASSIGNED` or `OUT_FOR_DELIVERY` to `DELIVERED_PAID`, `DELIVERED_UNPAID`, or `NOT_DELIVERED`.

**Verified** non-delivery reasons, recorded by the driver: `PHARMACY_CLOSED`, `PAYMENT_UNAVAILABLE`, plus an optional note. The admin invoice response does not include the delivery event. **Missing:** an admin endpoint that returns delivery events, recipient name, and non-delivery reason. The review screen cannot show them until that exists.

### 6.6 Product list, create, and edit

| Item | Specification |
| --- | --- |
| List columns | Thumbnail, name, barcode, manufacturer name, category, sale unit, availability, status, invoice currency, primary warehouse name, available quantity. Offer badge when `offerActive` is true. Search and paging follow section 16. |
| List actions | Open, create. |
| Create required | Name 2–160, barcode 4–64 unique, manufacturer id, active ingredient 2–200, minimum and maximum order quantities (integers, minimum at least 1, maximum at least the minimum), low-quantity threshold (integer, at least 0), pharmacy and consumer USD prices, category, sale unit, at least one warehouse stock, and one image file. |
| Create optional | Invoice currency, default `SYP`. `calculateSypFromRate`, default false. When false, SYP pharmacy and consumer prices are required. Offer fields when the offer is on. |
| Image | **Required.** One JPEG, PNG, or WebP file, at most 5 MB. The server stores it in Amazon S3. The current API only accepts an optional `imageUrl` string and has no upload. The form uses a file picker, shows the current image, and can replace it. A failed replacement keeps the previous image. |
| Prices | Decimal strings, up to two fraction digits, greater than zero. Not a float typed by the user without formatting. |
| Categories | `NATIONAL_MEDICINE`, `FOREIGN_MEDICINE`, `ACCESSORY`. |
| Sale units | `PACK`, `BOX`, `SACHET`. |
| Stocks | Warehouse, physical quantity at least 0. One warehouse is primary even if the flag is omitted. More than one warehouse requires exactly one `isPrimary: true`. The same warehouse cannot appear twice. |
| Edit | Same product fields, including availability (`AVAILABLE`, `UNAVAILABLE`) and status (`ACTIVE`, `DISABLED`). Stock is not part of `PATCH`. |
| Stock edit | Replace the whole set, or set one warehouse’s physical quantity. Quantity cannot fall below `reservedQuantity` (`RESERVED_STOCK_LOCKED`). Changing primary does not change quantities and does not change old invoices. |
| Manufacturer | Picker from `GET /admin/manufacturers`. Inactive manufacturer fails with `MANUFACTURER_INACTIVE`. |
| Offer | On requires paid units, free units, start, and end, with end after start. Off clears the offer fields. |
| APIs | `GET/POST /admin/products`, `GET/PATCH /admin/products/:id`, `PUT /admin/products/:id/stocks`, `PATCH /admin/products/:id/stocks/:warehouseId`, `PATCH /admin/products/:id/primary-warehouse`. |

**Proposed** layout: one product form with sections for identity, prices, offer, and warehouses. Do not split stock into a wizard unless the form becomes too long. The primary warehouse must be visible next to each quantity.

### 6.7 Warehouses

| Item | Specification |
| --- | --- |
| List | Name, address. |
| Create and edit | Name 2–160, unique. Address 2–500. |
| Detail | Warehouse fields plus products: product id, name, barcode, quantity, whether this warehouse is primary for that product. This product list does not include reserved or available quantity. |
| Missing | Deactivate or delete. A warehouse that is still linked cannot be removed from the UI because no endpoint exists. |
| APIs | `POST/GET /admin/warehouses`, `GET/PATCH /admin/warehouses/:id`, `GET /admin/warehouses/:id/products`. |

### 6.8 Manufacturers

| Item | Specification |
| --- | --- |
| List | Name, status. |
| Create and rename | Name 2–160, unique. |
| Status | `ACTIVE` or `DISABLED`. Disabled manufacturers cannot be selected for a product. |
| Missing | Delete. |
| APIs | `POST/GET /admin/manufacturers`, `GET/PATCH /admin/manufacturers/:id`, `PATCH /admin/manufacturers/:id/status`. |

### 6.9 Exchange rate

| Item | Specification |
| --- | --- |
| Purpose | Set how many Syrian pounds equal one US dollar. |
| Field | `usdToSyp`, decimal string, up to four fraction digits, greater than zero. |
| Effect | Products with `calculateSypFromRate` have their SYP prices recalculated. Products with the switch off stay fixed. Existing invoices do not change. |
| Empty | `GET` returns not found until the rate has been set once. The screen must allow the first save. |
| API | `GET /admin/exchange-rate`, `PUT /admin/exchange-rate`. |

### 6.10 Rejection reasons

| Item | Specification |
| --- | --- |
| List | Label, status. |
| Create and rename | Label, unique. |
| Status | `ACTIVE` or `DISABLED`. Only an active reason can be chosen on reject. |
| API | `POST/GET /admin/rejection-reasons`, `PATCH /admin/rejection-reasons/:id`, `PATCH /admin/rejection-reasons/:id/status`. |

### 6.11 Pharmacies

| Item | Specification |
| --- | --- |
| Create | Name 2–120, mobile number, address 2–500, initial password 8–128. Password is entered once and never shown again. |
| Profile | Id, name, mobile, address, status, timestamps. |
| Status | `ACTIVE` or `DISABLED`. Disabling also disables the credential. |
| Missing | List, search, edit profile, reset password, order history on the profile. Order history is visible only by scanning `GET /admin/orders`. |
| Conflict | Duplicate mobile number returns conflict. |
| APIs | `POST /admin/pharmacies`, `GET /admin/pharmacies/:id`, `PATCH /admin/pharmacies/:id/status`. |

### 6.12 Pharmacy statement and receipt

| Item | Specification |
| --- | --- |
| Statement | Pharmacy name. Per currency: opening balance, charges, payments, outstanding, and lines. Each line is `CHARGE` or a payment kind, with amount, time, invoice id, payment id. |
| Unpaid invoices | Invoice id, order id, currency, amount, delivered time, due date, overdue flag. |
| Due date | **Verified.** `dueDate` is the delivery time, and `overdue` is true when that time is already in the past. There is no separate credit-term field. The UI must not invent “30 days”. |
| Receipt | Pharmacy, currency, amount, receiver name 2–120, method `CASH` or `BANK_TRANSFER` (default cash), 1–20 invoice ids. |
| Receipt rule | Amount must equal the full total of every selected invoice. Invoices must belong to that pharmacy, be `DELIVERED_UNPAID`, share that single currency, and not be repeated. Partial payment is rejected. |
| Missing | List of past receipts. The statement lines are the place to show payments that were recorded. |
| APIs | `GET /admin/pharmacies/:pharmacyId/statement`, `POST /admin/receipts`. |

### 6.13 Drivers and settlement

| Item | Specification |
| --- | --- |
| Create | Name 2–120, mobile number, initial password 8–128. No address field. |
| Profile | Id, name, mobile, status. |
| Status | `ACTIVE` or `DISABLED`. An inactive driver cannot receive an assignment. |
| Position | Assigned count, delivered-paid count, delivered-unpaid count, not-delivered count, holdings per currency (`collected`, `handedOver`, `held`), collection lines (`paymentId`, currency, amount, settled, invoice ids). |
| Handover | Driver id, currency, amount, receiver name, one or more payment ids. Amount must equal the selected whole collections. |
| Missing | Driver list, edit profile, reset password, settlement history list. |
| APIs | `POST /admin/drivers`, `GET /admin/drivers/:id`, `PATCH /admin/drivers/:id/status`, `GET /admin/drivers/:driverId/settlement`, `POST /admin/driver-settlements`. |

### 6.14 Reports

All report amounts stay in the currency stored on the invoice. Do not convert them with the current exchange rate.

| Report | Inputs | Output |
| --- | --- | --- |
| Sales | `from`, `to`, optional `pharmacyId`, optional `category` | Totals by currency for the period. |
| Products and stock | `from`, `to` | Best sellers, slowest sellers, low quantity, unavailable, quantities by warehouse. Seller rows are product, currency, and paid quantity. Stock rows include physical, reserved, and available quantity. |
| Debts | `from`, `to` | Pharmacy balances, unpaid invoices, payments in the period, total due. |
| Drivers | none | Same counts and holdings as the settlement summary, for every driver included by the report. |

Period rule: `from` must not be after `to` (`REPORT_PERIOD_INVALID`).

**Proposed** controls: date range required on the first three reports. Sales filters for pharmacy and category. No chart is required by the API. Tables are sufficient. A chart may be added later only as a view of these same numbers.

APIs: `GET /admin/reports/sales`, `/products`, `/debts`, `/drivers`.

### 6.15 Notifications

| Item | Specification |
| --- | --- |
| List | Id, kind, title, body, resource type, resource id, `readAt`, `createdAt`. Audience is the shared admin inbox (`audienceId` null). |
| Kinds | `ORDER_SUBMITTED`, `INVOICE_APPROVED`, `INVOICE_REJECTED`, `INVOICE_ASSIGNED`, `DELIVERY_UPDATED`, `PAYMENT_RECORDED`, `AMOUNT_DUE`. Admin rows are created for new orders, delivery updates, and warehouse returns. Approval, rejection, assignment, and payment notices are sent to the pharmacy, and assignment also to the driver. The admin inbox will not contain every kind. |
| Action | Mark one as read. Open the resource when the type is `order` or `invoice`. |
| Missing | Mark all read, unread count endpoint, push or SMS. Channel is in-app only. |
| API | `GET /admin/notifications`, `POST /admin/notifications/:id/read`. |

### 6.16 Audit panel

| Item | Specification |
| --- | --- |
| Purpose | Show who changed one record. Place it on the product (stock), invoice, and payment, not as a standalone feed. |
| Query | `resourceType` and `resourceId`, each 1–40 characters. Known types written by the server: `invoice`, `payment`, and the stock resource type used by the product service. |
| Row | Actor user id, action, detail JSON, time. Actions: `STOCK_QUANTITY_CHANGED`, `INVOICE_STATUS_CHANGED`, `PAYMENT_RECORDED`. |
| Missing | Actor name, global feed, filters by date or action. |
| API | `GET /admin/audit`. |

---

## 7. Core user flows

### 7.1 Sign in

1. Open sign in.
2. Enter mobile number and password.
3. `POST /admin/auth/sign-in`.
4. Success: keep the token, call `GET /admin/auth/me`, show the shell.
5. Failure: stay on the form. Password is not retained in the page after navigation.
6. Data: no business record changes except the first-run bootstrap user, which the server may create before checking the password.

### 7.2 Set up a product

1. Create at least one warehouse and one active manufacturer.
2. Set the exchange rate if any SYP price will be calculated.
3. Open create product. Choose manufacturer, category, sale unit, prices, limits, and warehouses.
4. Choose the primary warehouse when more than one warehouse is linked.
5. Save. Server rejects duplicate barcode, duplicate warehouse link, missing primary, inactive manufacturer, invalid offer dates, or a maximum below the minimum.
6. Success: product is `ACTIVE` and `AVAILABLE` by default.
7. Later quantity edits write an audit row and do not change other warehouses or old invoices.

### 7.3 Change the exchange rate

1. Open the setting. If none exists, the form is empty.
2. Enter the new rate and confirm. **Proposed** confirmation, because every calculated SYP price changes.
3. `PUT /admin/exchange-rate` recalculates those products.
4. Fixed SYP prices and old invoices stay as they were.

### 7.4 Review an order

1. Open the order list, then one order.
2. For each pending invoice, check the snapshotted lines and the primary warehouse on those lines.
3. Approve one invoice. Stock is reserved. A second click on an already approved invoice fails with `INVOICE_NOT_PENDING`.
4. Or reject it, with a reason, a note, both, or neither. Other invoices in the order stay pending.
5. Pharmacy notifications are created for approve and reject.
6. The order status label updates from the invoice statuses. The user does not set it.

### 7.5 Assign and send out again

1. On an approved invoice, choose an active driver and assign.
2. Status becomes `ASSIGNED`. Driver and pharmacy are notified. The driver cannot refuse or reassign in the driver app.
3. After the driver records a result, the dashboard shows the new status. The admin does not enter that result.
4. If the invoice is `NOT_DELIVERED` or `DELIVERED_UNPAID` and has not been paid, return it. Confirm first. Stock changes once.
5. Assigning that returned invoice sends it `OUT_FOR_DELIVERY` and reserves stock again. This continues the same invoice. It does not create a second invoice.

### 7.6 Open a pharmacy and record a receipt

1. Create the pharmacy and give it a password out of band. The screen must not show the password after save.
2. There is no list, so reaching the profile later requires the id. **Missing** for daily use.
3. Open the statement. Select only `DELIVERED_UNPAID` invoices in one currency.
4. The amount field must match their full sum. The server rejects any other amount.
5. Save the receipt. A payment audit row and a pharmacy notification are created. The invoice status does not change to a separate “paid” status; payment is the allocation. `DELIVERED_PAID` means the driver collected on delivery, which is a different payment kind (`DRIVER_COLLECTION`).

### 7.7 Settle a driver

1. Open the driver position. **Missing** list makes this hard without an id.
2. Select unsettled collections in one currency.
3. Enter the receiver name. Amount must equal those collections.
4. Save. Those collections become settled and cannot be handed over twice.

### 7.8 Read a report

1. Choose the report and, where required, a period.
2. The screen shows the returned groups. Empty arrays are a valid successful report.
3. No data is written.

### Irreversible or hard-to-undo actions

| Action | Why it needs confirmation |
| --- | --- |
| Approve invoice | Reserves stock. Cannot be undone by a reject call. |
| Reject invoice | Terminal for that invoice. |
| Assign driver | Driver cannot refuse. |
| Return to warehouse | Stock changes once. A second return is blocked by the unique return row. |
| Receipt | Unique allocation per invoice and currency. |
| Driver handover | A collection can be settled once. |
| Replace exchange rate | Recalculates every linked SYP price. |
| Disable pharmacy or driver | Blocks sign-in or assignment. |

No server-side undo was found for these actions.

---

## 8. Data requirements

### 8.1 Display formats

| Data | Format |
| --- | --- |
| Money | Decimal string from the API. Show currency code `USD` or `SYP` beside it. Do not mix currencies in one total. |
| Exchange rate | Decimal string, up to four places. |
| Quantities | Integers. Available = physical − reserved. |
| Dates | ISO timestamps from the API. Display in the operator’s local zone. The zone is **not specified**. |
| Identifiers | Integer ids. Use them in routes and API calls. |
| Status | Show the enum in human language. Keep the enum value for logic. |

**Proposed** English labels for the enums, not a visual style:

| Enum | Label |
| --- | --- |
| `NATIONAL_MEDICINE` | National medicines |
| `FOREIGN_MEDICINE` | Foreign medicines |
| `ACCESSORY` | Accessories |
| `PACK` / `BOX` / `SACHET` | Pack / Box / Sachet |
| `AVAILABLE` / `UNAVAILABLE` | Available / Unavailable |
| `ACTIVE` / `DISABLED` | Active / Disabled |
| `DELIVERED_PAID` | Delivered and paid |
| `DELIVERED_UNPAID` | Delivered, unpaid |
| `NOT_DELIVERED` | Not delivered |
| `RETURNED_TO_WAREHOUSE` | Returned to warehouse |
| `OUT_FOR_DELIVERY` | Out for delivery |
| `CASH` / `BANK_TRANSFER` | Cash / Bank transfer |

UI language itself is an open question. The SRS is written in Arabic and English. The API is English.

### 8.2 Sensitive data

| Data | UI rule |
| --- | --- |
| Password and `passwordHash` | Never display, never echo, never put in a URL. Password fields are write-only on create and sign-in. |
| Access token | Store for requests. Do not render it. |
| Bootstrap admin password | Server configuration only. Not a screen. |
| Mobile numbers | Visible to the admin. They are sign-in identifiers. |

### 8.3 Read-only after creation

| Data | Rule |
| --- | --- |
| Invoice lines | Snapshot. Not editable. |
| Order | No edit and no cancel. |
| Payment and settlement rows | No update endpoint. |
| Delivery events | Append-only. |
| Audit entries | Append-only. No `updatedAt`. |
| Pharmacy and driver profile fields | Create-only, except status. |

---

## 9. API and integration reference

Authentication: Bearer token, role `ADMIN`, except sign-in. Validation failures are HTTP 422. Business-rule failures (`InvalidStateException`) are HTTP 400 with a stable `code`. Unknown ids are HTTP 404. Unique conflicts are HTTP 409. Wrong role is HTTP 403. Missing or bad token is HTTP 401.

| Method | Path | Purpose | Body or query | Result |
| --- | --- | --- | --- | --- |
| POST | `/admin/auth/sign-in` | Sign in | `mobileNumber`, `password` | Token. Public. |
| GET | `/admin/auth/me` | Current admin | — | User without password. |
| GET | `/admin/orders` | List orders | — | Full array. |
| GET | `/admin/orders/:id` | One order | — | Order and invoices. |
| GET | `/admin/invoices/:id` | One invoice | — | Invoice and lines. |
| POST | `/admin/invoices/:id/approve` | Approve | — | Invoice. 200. |
| POST | `/admin/invoices/:id/reject` | Reject | optional `rejectionReasonId`, `customReason` | Invoice. 200. |
| POST | `/admin/deliveries` | Assign or send out again | `invoiceId`, `driverId` | Assignment. |
| POST | `/admin/returns` | Return to warehouse | `invoiceId` | Invoice. 200. |
| GET/POST | `/admin/products` | List, create | create body in section 6.6 | Product. |
| GET/PATCH | `/admin/products/:id` | Read, update fields | partial product | Product. |
| PUT | `/admin/products/:id/stocks` | Replace links | `{ stocks: [...] }` | Product. Audited. |
| PATCH | `/admin/products/:id/stocks/:warehouseId` | One quantity | `{ quantity }` | Product. Audited. |
| PATCH | `/admin/products/:id/primary-warehouse` | Change primary | `{ warehouseId }` | Product. |
| GET/POST | `/admin/warehouses` | List, create | name, address | Warehouse. |
| GET/PATCH | `/admin/warehouses/:id` | Read, update | name, address | Warehouse. |
| GET | `/admin/warehouses/:id/products` | Stock in one warehouse | — | Product rows. |
| GET/POST | `/admin/manufacturers` | List, create | `{ name }` | Manufacturer. |
| GET/PATCH | `/admin/manufacturers/:id` | Read, rename | `{ name }` | Manufacturer. |
| PATCH | `/admin/manufacturers/:id/status` | Activate or disable | `{ status }` | Manufacturer. |
| GET/PUT | `/admin/exchange-rate` | Read or replace | `{ usdToSyp }` | Rate. |
| GET/POST | `/admin/rejection-reasons` | List, create | `{ label }` | Reason. |
| PATCH | `/admin/rejection-reasons/:id` | Rename | `{ label }` | Reason. |
| PATCH | `/admin/rejection-reasons/:id/status` | Activate or disable | `{ status }` | Reason. |
| POST | `/admin/pharmacies` | Create account | name, mobile, address, password | Profile. Password not returned. |
| GET | `/admin/pharmacies/:id` | Read profile | — | Profile. |
| PATCH | `/admin/pharmacies/:id/status` | Enable or disable | `{ status }` | Profile. |
| GET | `/admin/pharmacies/:pharmacyId/statement` | Statement | — | Balances and lines. |
| POST | `/admin/receipts` | Receipt voucher | section 6.12 | Payment. |
| POST | `/admin/drivers` | Create account | name, mobile, password | Profile. |
| GET | `/admin/drivers/:id` | Read profile | — | Profile. |
| PATCH | `/admin/drivers/:id/status` | Enable or disable | `{ status }` | Profile. |
| GET | `/admin/drivers/:driverId/settlement` | Position | — | Counts, holdings, collections. |
| POST | `/admin/driver-settlements` | Handover | section 6.13 | Settlement. |
| GET | `/admin/reports/sales` | Sales | `from`, `to`, optional `pharmacyId`, `category` | Totals. |
| GET | `/admin/reports/products` | Product report | `from`, `to` | Sellers and stock. |
| GET | `/admin/reports/debts` | Debt report | `from`, `to` | Balances and unpaid. |
| GET | `/admin/reports/drivers` | Driver report | — | Rows. |
| GET | `/admin/notifications` | Admin inbox | — | Full array. |
| POST | `/admin/notifications/:id/read` | Mark read | — | Notification. 200. |
| GET | `/admin/audit` | One resource trail | `resourceType`, `resourceId` | Entries. |

### 9.1 Codes the UI should recognize

| Code | When |
| --- | --- |
| `INVOICE_NOT_PENDING` | Approve or reject when the invoice is no longer pending. |
| `INVOICE_NOT_APPROVED` | Assign when it is not approved and not a warehouse return. |
| `INSUFFICIENT_STOCK` | Approval or redelivery cannot reserve the quantity. |
| `RESERVED_STOCK_LOCKED` | New physical quantity is below reserved quantity. |
| `PRIMARY_WAREHOUSE_REQUIRED` | More than one warehouse and not exactly one primary. |
| `WAREHOUSE_LINK_DUPLICATED` | Same warehouse twice on one product. |
| `ORDER_LIMIT_INVALID` | Maximum below minimum. |
| `OFFER_INVALID` | Active offer missing units or dates. |
| `MANUFACTURER_INACTIVE` | Selected manufacturer is disabled. |
| `DRIVER_INACTIVE` | Assignment target is disabled. |
| `REJECTION_REASON_INACTIVE` | Chosen reason is disabled. |
| `RETURN_NOT_ALLOWED` | Status cannot return, or the invoice is already paid. |
| `RECEIPT_AMOUNT_MISMATCH` | Receipt amount is not the full invoice total. |
| `INVOICE_NOT_DUE` | Receipt includes an invoice that is not delivered unpaid. |
| `INVOICE_CURRENCY_MISMATCH` | Receipt currency does not match the invoice. |
| `INVOICE_PHARMACY_MISMATCH` | Invoice belongs to another pharmacy. |
| `INVOICE_DUPLICATED` | Same invoice twice on one receipt. |
| `EXCHANGE_RATE_INVALID` | Rate is not greater than zero. |
| `REPORT_PERIOD_INVALID` | `from` is after `to`. |
| `CONFLICT` | Duplicate barcode, mobile number, manufacturer name, warehouse name, or rejection label. |

### 9.2 Missing endpoints that block ordinary screens

| Gap | Effect on design |
| --- | --- |
| No `GET /admin/pharmacies` | A pharmacy list cannot be populated. |
| No `GET /admin/drivers` | A driver picker and driver list cannot be populated. |
| No paging or search parameters yet | **Required** by section 16. The current handlers still return the full array. |
| No delivery-event read for admin | Recipient, time, and non-delivery reason cannot be shown on the invoice. |
| No return list | The returns area is an action, not a queue. |
| No receipt list | History is only the statement lines. |
| No global audit list | Audit is a side panel. |
| No file upload or S3 | **Required:** one product image in Amazon S3. Today the field is an optional URL. |
| No admin sign-out | **Required:** server-side sign-out. Today the token stays valid until `expiresIn`. No refresh token is required. |

Driver delivery (`POST` under `driver/deliveries`) and pharmacy ordering are outside this dashboard. They change statuses the dashboard then reads.

---

## 10. UI states and edge cases

Apply these to every data screen.

| State | Behavior |
| --- | --- |
| First load | Show a loading state until the request finishes. Do not show an empty table during the request. |
| Refresh | Keep the last successful data visible and indicate that a refresh is running. |
| Empty | Distinct from an error. Examples: no products, no orders, exchange rate not set, no notifications, report arrays empty. |
| No matches | The server search returned an empty page. Say that nothing matched. This is different from a list that has not loaded. |
| Validation | Show field errors for 422 responses. Keep the user’s input. |
| Business rule | Show the server message for 400 responses. Leave the record unchanged. |
| Not found | 404 on a detail route. Offer a way back to the parent list. |
| Forbidden | 403. Do not reveal the record. |
| Session expired | 401. Return to sign in and discard the token. |
| Network or 500 | Retry the read. Do not retry a POST automatically. |
| Success | Confirm the new status or id, then refresh the parent data. |
| Disabled action | Hide or disable approve unless status is `PENDING`, assign unless `APPROVED` or `RETURNED_TO_WAREHOUSE`, and return unless `NOT_DELIVERED` or `DELIVERED_UNPAID`. |
| Partial failure | Approving one invoice must not look like the whole order failed or succeeded. Show each invoice’s own result. |
| Long text | Product names, addresses, and rejection notes need to wrap or truncate with the full value available. |
| Large lists | Show one server page, the total count, and controls for the next page. Do not page a fully downloaded list. |
| Double submit | Disable the primary button while the request is in flight. Repeated approve, receipt, or return calls fail on the server; the UI should not depend on that as the only protection. |
| Concurrent update | Two admins can approve the same invoice. The second receives `INVOICE_NOT_PENDING`. Show that and reload. |
| Mixed currency | Never add USD and SYP into one number. |
| Low stock | Available quantity at or below `lowQuantityThreshold` on the primary warehouse is the limited-quantity condition used by the pharmacy app. Show it on the product. |
| Unavailable product | Still exists. Pharmacies can see it and cannot order it. The admin can still edit it. |
| Disabled product | `status` `DISABLED` is separate from `availability`. |
| Calculated price | When `calculateSypFromRate` is on, SYP inputs are not required on create and should be shown as results after save. |
| Snapshot | Invoice prices stay put when the product or rate changes. Label invoice lines as captured at submission. |
| Due immediately | An unpaid delivered invoice is overdue as soon as its delivery time is in the past. |
| Paid invoice | Cannot be returned. |
| Reserved quantity | Stock form must show reserved and available, and must not allow a physical quantity below reserved. |

---

## 11. UX and accessibility requirements

These are functional requirements. They are not a color, type, or brand choice.

| Requirement | Expectation |
| --- | --- |
| Desktop first | **Inferred.** Tables for orders, stock, statements, and reports are dense. Design the primary layout for a desktop width. A narrow layout may stack filters and collapse secondary columns, but data entry for products and receipts must remain possible. No mobile-admin requirement is written in the SRS. |
| Hierarchy | Status and the next action come before secondary fields. Money and quantity are easier to scan than ids, but ids stay available. |
| Tables | Sticky header, readable row height, status not indicated by color alone, numeric columns aligned, row action for the next step. |
| Forms | Labels on every field, required state in text, errors next to the field, units and currency visible, disabled submit while saving. |
| Consistency | One pattern for list, detail, create, status change, and confirm. Invoice status uses the same labels on the order, the report, and the statement. |
| Confirmation | Use it for the irreversible actions in section 7. The confirm step states the stock or money effect. |
| Accessibility | Text alternatives for status, keyboard access to navigation and dialogs, visible focus, contrast that does not depend on a future palette, errors announced to assistive technology. Target WCAG 2.2 AA as the expectation for the later audit. |
| Language | Do not bake a direction into components in a way that blocks Arabic. **Open:** whether version 1 UI copy is Arabic, English, or both. |
| Preserve | Invoice-level actions, derived order status, dual currency, primary warehouse, and whole-invoice payment. Do not redesign these into a cart, a single order status button, or a partial-payment form. |

---

## 12. Existing functionality versus gaps

| Area | In the API now | Not in the API |
| --- | --- | --- |
| Auth | Admin sign-in and current user | Server sign-out is required and not built. Password change and staff roles remain absent. |
| Catalog | Product, warehouse, manufacturer, rate, rejection reasons. Optional `imageUrl` string. | S3 image upload is required and not built. Warehouse deactivate and delete remain absent. |
| Orders | List, detail, approve, reject, assign, redelivery through assign | Server paging and search are required and not built. Edit, cancel, and delivery-event details for admin remain absent. |
| Stock | Manual quantity, reserve on approve, issue on delivery, return once | Goods-receipt documents, expiry, batches |
| Accounts | Create and disable pharmacy and driver, statement, receipt, settlement | Lists, profile edit, password reset |
| Reports | Four read endpoints | Saved periods, export file, home dashboard aggregate |
| Notifications | Admin inbox and mark read | Push, mark all, unread count |
| Audit | Per resource | Global log, actor display name |
| UI | None | Entire dashboard |

SRS items that the schema and services have since made concrete, so the design should follow the code when they differ:

| SRS draft | Current code |
| --- | --- |
| Invoice status includes `Draft` and `Redelivery Pending` | Not in `InvoiceStatus`. Preparation happens in the pharmacy app before submit. Redelivery is `OUT_FOR_DELIVERY`. |
| Parent statuses described as a recommendation | Implemented by `deriveOrderStatus`. |
| “Proposed” stock split of physical, reserved, and available | Implemented. Available is computed, not stored. |
| Notification channel undecided | In-app rows exist. Push does not. |
| Staff permissions later | Still absent. |

---

## 13. Open questions

| Question | Why it matters |
| --- | --- |
| Is the dashboard UI Arabic, English, or both? | Layout direction, labels, and mixed pharmacy names. |
| Will pharmacy and driver list endpoints be added before UI build? | Without them, account screens and the driver picker are incomplete. |
| Should the admin see delivery events? | The review screen cannot show recipient, time, or why delivery failed. |
| Is “overdue” immediately after delivery the business rule to display? | The statement and debt report currently behave that way. A credit period would be a product change, not a design choice. |
| Does disabling a product differ from marking it unavailable in the way staff should understand it? | Both fields exist. The pharmacy rules in the SRS talk about availability. |
| Who operates the dashboard besides the bootstrap admin? | Affects whether sign-in copy says “administrator” only. |

---

## 14. Screens to design first

Design only after a direction is chosen, and design in this order. Each step is usable with the current API except where noted.

| Order | Screens | Reason |
| --- | --- | --- |
| 1 | Sign in and shell, including server sign-out | Required before any other screen. The sign-out endpoint is not built yet. |
| 2 | Product list, create, edit, including the image file and warehouses on the form | First delivery in the project timeline. Paging, search, and S3 upload are required and not built yet. |
| 3 | Warehouses, manufacturers, exchange rate | Required before a product can be saved. |
| 4 | Order list and order detail with approve, reject, and assign | Core daily work. Assign’s driver picker is blocked by the missing driver list; design the control and mark the data source as missing. |
| 5 | Rejection reasons | Needed by the reject form. Small. |
| 6 | Pharmacy statement and receipt, driver settlement | Money flows. Profile pages can be designed by id. Lists wait on missing endpoints. |
| 7 | Four reports | Read-only and already specified. |
| 8 | Notifications and the audit panel | Secondary to the operational screens. |
| 9 | Home | Compose it from orders and notifications. Do not invent KPIs. |

Do not start Figma with a visual system that assumes staff roles, global search, partial payments, or a returns queue. Those are not in the current product.

---

## 15. Analysis limits

- Reviewed admin controllers, the DTOs and services they call, Prisma models, order-status derivation, receipt and return rules, and the SRS.
- No admin UI routes exist to inventory.
- List sort order in repository queries was not treated as a product guarantee.
- Exact copy of every 400 message is in the service that throws it. The table in section 9.1 is the set a designer needs for states.
- This file does not change application code, schema, or API behavior.

---

## 16. Requirements added on 5 November 2026

These three items are version-1 requirements in `docs/srs-en.md`, `docs/srs-ar.md`, and `docs/timeline-and-financial-proposal.md`. The current API does not implement them.

### 16.1 Server-side paging and search

Design every growing admin list with a search box or the filters below, a page control, and the total count. The server searches and filters before it cuts the page. Default page size is 20. Maximum page size is 100. Orders are newest first. Named lists are sorted by name.

| List | Search | Filters |
| --- | --- | --- |
| Products | Name, barcode, active ingredient | Category, availability, status |
| Orders | Order number, pharmacy name | Derived status, order date |
| Warehouses | Name | — |
| Manufacturers | Name | Status |
| Pharmacies | Name, mobile number | Status |
| Drivers | Name, mobile number | Status |
| Rejection reasons | Label | Status |
| Notifications | — | Read state, kind |

Pharmacy and driver lists are still missing as endpoints. When they are added, they use this same paging contract. There is still no single global search box.

### 16.2 Product image on Amazon S3

The current `imageUrl` field is an optional string the client may send. The new requirement replaces that with a file upload.

- One image is required to create a product.
- The administrator can replace it. A failed replacement leaves the previous image.
- The server stores the file in Amazon S3 and returns a display URL. The database does not store the file bytes.
- S3 credentials are never shown in the dashboard.
- Accepted files are JPEG, PNG, and WebP, up to 5 MB.
- The product list shows a thumbnail. The pharmacy app shows the current image. An invoice does not keep its own copy of the image.

### 16.3 Server-side sign-out

The shell sign-out action calls the server, then drops the token. After a successful sign-out, the same access token is rejected. The same rule applies to the pharmacy app and the driver app. No sign-out route exists today.
