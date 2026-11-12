# Pharmacy Mobile App Product Specification

**Product:** Pharmacy & Warehouse Distribution Management System  
**Audience:** UI/UX design and Figma Make  
**Status:** Analysis of the current repository. This document does not choose a visual direction.  
**Requirements update, 5 November 2026:** The pharmacy product list is paged and searched on the server, each product has one image stored in Amazon S3, and pharmacy sign-out is enforced on the server. Catalog paging, search, sign-out, the statement, most-requested products, and invoice-by-id are implemented on `/pharmacy`. The Amazon S3 upload is still not implemented. See section 16.  
**Sources:** `docs/srs-en.md`, `docs/timeline-and-financial-proposal.md`, `docs/ADMIN-DASHBOARD-PRODUCT-SPEC.md`, `docs/ARCHITECTURE/FLUTTER_CLEAN_ARCHITECTURE_TEMPLATE.md`, `backend/prisma/schema.prisma`, and the NestJS pharmacy API under `backend/src`.

## How to read evidence labels

| Label | Meaning |
| --- | --- |
| **Verified** | Confirmed in the current backend or in the project SRS. |
| **Inferred** | Strongly suggested by the implementation, but not stated as a product decision. |
| **Missing** | Needed to operate the pharmacy app, and not present in the current pharmacy API. |
| **Proposed** | A design recommendation. It is not an implemented screen, route, or endpoint. |

There is no pharmacy mobile application in this repository. Every screen below is **Proposed**. API paths, fields, and rules cited from controllers, DTOs, services, or the schema are **Verified** unless marked otherwise.

---

## 1. Product overview

### 1.1 Purpose

**Verified.** The system distributes national medicines, foreign medicines, and accessories from warehouses to pharmacies. The pharmacy app is the client a registered pharmacy uses to sign in, browse products, prepare an invoice, submit an order, and follow that order (`docs/srs-en.md`, sections 1.2, 7, and 8).

The operating rule is the same as the rest of the system: **an order groups invoices; stock, delivery, collection, and delivery status are managed on each invoice.** The parent order status is calculated from its invoices. The pharmacy does not set it and cannot edit it (`backend/src/modules/order/helpers/derive-order-status.helper.ts`).

### 1.2 Role of the pharmacy app

**Verified.** The app is one of three clients:

| Client | Who uses it | What it does |
| --- | --- | --- |
| Admin Dashboard | Administrator | Pharmacies, drivers, products, warehouses, orders, invoices, stock, accounts, reports |
| Pharmacy mobile app | Registered pharmacy | Sign in, browse, submit orders, track invoices |
| Driver mobile app | Registered driver | See assigned invoices and record delivery and collection |

The pharmacy app calls only routes under `/pharmacy`. It does not call `/admin` or `/driver`.

Warehouses have no account and no app. The pharmacy does not choose a warehouse. Quantity available for ordering is the primary warehouse quantity, and that warehouse is stored on the invoice at submission (`docs/srs-en.md`, section 4.4).

Week two of the delivery plan is this app: sign-in with one active session, catalog browse and search, the working invoice, order split by category, and order history (`docs/timeline-and-financial-proposal.md`, week 2).

### 1.3 Intended user

| User | Evidence | Responsibility in the app |
| --- | --- | --- |
| Registered pharmacy | **Verified.** `AccountRole.PHARMACY`. The administrator creates the account and sets the password (`docs/srs-en.md`, section 7.1). | Sign in, read the catalog, submit orders, read own orders, invoices, notifications, and profile. |
| Pharmacist staff inside one pharmacy | **Missing.** One account per pharmacy. There is no second user, no permission list, and no shared session. | None. |
| Administrator, driver, warehouse owner | **Verified.** Other audiences. | Cannot use this app. A non-pharmacy token is rejected. |

### 1.4 Problems the app solves

**Verified** from the SRS pharmacy sections and the pharmacy controllers:

- Sign in with the mobile number and password issued by the administrator, on one device at a time.
- Browse products by category and search by name, barcode, and category.
- See the current product image, the pharmacy selling price, the suggested consumer price, the sale unit, the primary-warehouse quantity, and availability.
- See a limited-quantity label when the primary quantity is at or below the alert threshold.
- Keep an unavailable product visible, and keep it off the invoice.
- Add products directly to an invoice, change paid quantities, apply product offers and order limits, then submit.
- Receive one order that contains one, two, or three invoices, one per category present in the submission.
- Read previous orders, invoice statuses, rejection reasons, and the prices and quantities captured at submission.
- See the products this pharmacy has requested most often.
- Read the pharmacy profile, including balance and outstanding debts.
- Read in-app notices for approval, rejection, assignment, delivery, payment, and an amount that remains due.
- Sign out so the same access token is rejected by the server.

### 1.5 Words the interface uses

**Verified.** The prepared group of products is called an **invoice**. The name “shopping cart” is not used (`docs/srs-en.md`, section 4.5).

Two moments use that word, and the screens must keep them distinct:

| Moment | What the pharmacist sees | Where it lives |
| --- | --- | --- |
| Before submit | One working invoice. Products are added to it. Quantities can change. | On the device only. The server has no draft. |
| After submit | One order, containing a national-medicines invoice, a foreign-medicines invoice, an accessories invoice, or a subset of those. | `orders` and `invoices`. Each invoice has its own id, status, and amount. |

The working invoice is not a stored `Draft` status. `InvoiceStatus` has no `DRAFT` value. Preparation stays in the app until `POST /pharmacy/orders`.

### 1.6 Main entities the app shows

| Entity | What the pharmacy sees | Where it lives |
| --- | --- | --- |
| User | The sign-in account behind the pharmacy. Role `PHARMACY`. The app never shows `passwordHash`. | `users` |
| Pharmacy | Own profile: id, name, mobile number, address, status. | `pharmacies` |
| Pharmacy session | The single active server session. A new sign-in revokes the previous one. | `pharmacy_sessions` |
| Product | Catalog row: image, prices in the invoice currency, unit, limits, offer, availability, primary quantity. | `products` |
| Order | One submission. Status is derived. | `orders` |
| Invoice | One category inside that order. | `invoices` |
| Invoice item | Name, barcode, unit, paid quantity, free quantity, prices, and offer captured at submission. | `invoice_items` |
| Notification | In-app message for this pharmacy only. | `notifications` |
| Statement | Charges, payments, outstanding balance, and unpaid invoices, per currency. | Built by the ledger service. The pharmacy route is **Missing**. |

The app does not show manufacturers as a directory, warehouses as a directory, drivers as accounts, rejection-reason settings, the exchange rate, or other pharmacies.

---

## 2. Architecture relevant to the app

**Verified.**

| Fact | Detail |
| --- | --- |
| Backend | NestJS application in `backend/`. |
| Pharmacy API module | `backend/src/modules/pharmacy-api.module.ts` registers every pharmacy controller. |
| Route prefix | Pharmacy controllers use paths beginning with `pharmacy/`. Swagger names this audience `pharmacy`, path prefix `/pharmacy`, JSON at `docs/pharmacy-json`. |
| Auth | `POST /pharmacy/auth/sign-in` returns a Bearer access token. Later calls send `Authorization: Bearer`. Guards are `JwtAuthGuard`, then `PharmacySessionGuard`, then `RolesGuard`. Class-level role is `AccountRole.PHARMACY`. |
| Session | The access token carries a pharmacy session id. `PharmacySessionGuard` rejects the token when that session is missing, revoked, or belongs to another pharmacy. |
| Database | PostgreSQL through Prisma. Schema: `backend/prisma/schema.prisma`. |
| Other clients | `admin-api.module.ts` and `driver-api.module.ts`. This app must not call those routes. |
| Client | No Flutter project, `pubspec.yaml`, screens, or routes exist in the repository. `docs/ARCHITECTURE/FLUTTER_CLEAN_ARCHITECTURE_TEMPLATE.md` is a generic client template. |
| External services | No payment gateway, maps, SMS, or push provider is wired. Notifications are rows in `notifications`. Product images are display URLs. Amazon S3 is required for the file and is not wired yet. |

**Inferred.** The intended client is a Flutter app, because the repository contains that template and the timeline calls week two “the pharmacy mobile app”. This specification does not choose iOS, Android, or both, and it does not choose a component library.

---

## 3. User roles and permissions

### 3.1 Implemented role

**Verified.** The only role this app accepts is `PHARMACY`. A pharmacy token cannot call admin or driver routes. An admin or driver token cannot call pharmacy routes.

| Capability | Pharmacy |
| --- | --- |
| View | Own profile, own orders, own notifications. |
| Create | One order, by submitting the working invoice. |
| Edit | Paid quantities on the working invoice, before submit, on the device. |
| Deactivate | Nothing. The administrator disables the account. |
| Delete | Nothing. |
| Extra authorization | The signed-in pharmacy is enough. The app has no second approver. |
| Cannot | Create the account, change the password, change name or address, edit or cancel a submitted order, approve or reject an invoice, assign a driver, record delivery, record a payment, see another pharmacy, see `passwordHash`, choose a warehouse. |

Sign-in rejects a disabled account, a wrong role, a wrong password, and an unknown mobile number with the same message: “The mobile number or password is incorrect” (`backend/src/authentication/auth.service.ts`). The form must not say which of those happened.

A disabled account that already holds a token is rejected on the next request by `JwtAuthGuard`.

### 3.2 Not implemented

| Topic | Status |
| --- | --- |
| Self-registration | **Missing.** The administrator creates the account. |
| Password change, reset, or “forgot password” | **Missing.** |
| Profile edit | **Missing.** Name, mobile number, and address are create-only on the admin API. |
| Server sign-out | **Required, and Missing.** See section 16. |
| Product catalog for this audience | **Required, and Missing.** Submit accepts product ids, and no pharmacy route returns products. |
| Account statement for this audience | **Required by the SRS profile, and Missing.** The statement exists on `GET /admin/pharmacies/:id/statement` only. |
| Most-requested products | **Required by the SRS, and Missing.** No ranking endpoint. |
| Invoice lookup by id | **Missing.** Notifications point at an invoice id. The pharmacy API returns invoices only inside an order. |
| Push, SMS, or a forced sign-out on the other device | **Missing.** The previous device learns the session ended on its next request. |

---

## 4. Information architecture

**Proposed** navigation, grouped by the tasks the pharmacy actually performs. Paths below are UI paths for the future app. They are not implemented.

```
Sign in
Shell
├── Home
│   ├── Working invoice entry
│   ├── Recent orders
│   └── Most requested          data source missing
├── Catalog
│   ├── Category
│   ├── Search
│   └── Product
├── Invoice                     the working invoice, on the device
│   └── Review and submit
├── Orders
│   ├── Order list
│   └── Order detail
│       └── Invoice detail      read only
├── Account
│   ├── Profile
│   └── Statement               endpoint missing
└── Notifications
```

### 4.1 Why this grouping

- The daily loop is catalog → working invoice → submit → follow the order. Those stay as separate destinations because the working invoice is local and the order is a server record.
- Categories are the way an order becomes separate invoices, so the catalog is entered by category as well as by search.
- Money stays under the account. The pharmacy reads a statement. It does not record a receipt.
- Notifications are a list with a jump into the related order, once the API can resolve an invoice id to an order.

### 4.2 Cross-navigation

| From | To | Why |
| --- | --- | --- |
| Catalog product | Working invoice | Add the product, or raise the paid quantity if it is already on the invoice. |
| Working invoice line | Product | Check image, offer, and limits before submit. |
| Home recent order | Order detail | The order list already returns the order id. |
| Notification whose `resourceType` is `invoice` | Invoice inside its order | **Blocked.** The payload has `resourceId` and no `orderId`, and there is no pharmacy invoice route. |
| Notification whose `resourceType` is `payment` | Statement | **Blocked.** There is no pharmacy payment route. The statement is the surface that shows payments, once that route exists. |
| Statement unpaid row | Order detail | The unpaid row includes `orderId` and `invoiceId` on the admin statement. The pharmacy route is **Missing**. |

### 4.3 Shell

**Proposed.** Persistent destinations: Home, Catalog, Invoice, Orders, Account. The invoice destination shows the count of products on the working invoice. Notifications are an entry on the shell, with an unread marker when `readAt` is null. The shell shows the pharmacy name from `GET /pharmacy/auth/me`.

### 4.4 Search

**Missing** as a pharmacy catalog endpoint. **Required:** search runs on the server, before the page is cut, over name, barcode, and category. The app does not download the catalog and filter it on the device (`docs/srs-en.md`, sections 8.1 and 16.3).

There is no global search across orders, invoices, and products.

### 4.5 Role differences

**Verified.** One pharmacy role. Navigation does not change per user. A disabled account never reaches the shell.

---

## 5. Screen inventory

Status of every row: **Proposed** screen. “API” says whether a pharmacy backend already supports it.

| Area | Screen | Proposed UI path | API support |
| --- | --- | --- | --- |
| Access | Sign in | `/sign-in` | **Verified** `POST /pharmacy/auth/sign-in` |
| Access | Session ended | `/sign-in` | **Verified** revoked, missing, or foreign session returns unauthenticated. |
| Shell | Signed-in frame, pharmacy name, invoice count, notifications | all authenticated screens | **Verified** `GET /pharmacy/auth/me` for the name. Invoice count is local. |
| Home | Continue the working invoice, recent orders | `/` | Orders: **Verified** `GET /pharmacy/orders`. Working invoice: local. |
| Home | Most requested | section of Home | **Verified** `GET /pharmacy/products/most-requested` |
| Catalog | Category list | `/catalog` | **Missing** product list. Categories themselves are the three enum values. |
| Catalog | Product list and search | `/catalog/:category`, `/catalog/search` | **Verified** `GET /pharmacy/products` |
| Catalog | Product detail | `/catalog/products/:productId` | **Verified** `GET /pharmacy/products/:id` |
| Invoice | Working invoice | `/invoice` | Local until submit. |
| Invoice | Review and submit | `/invoice/review` | **Verified** `POST /pharmacy/orders` |
| Orders | Order list | `/orders` | **Verified** `GET /pharmacy/orders` returns every row for this pharmacy. |
| Orders | Order detail | `/orders/:orderId` | **Verified** `GET /pharmacy/orders/:id` |
| Orders | Invoice detail | `/orders/:orderId/invoices/:invoiceId` | **Verified** inside the order, and `GET /pharmacy/invoices/:id` |
| Account | Profile | `/account` | **Verified** `GET /pharmacy/auth/me` |
| Account | Statement | `/account/statement` | **Verified** `GET /pharmacy/statement` |
| Ops | Notifications | `/notifications` | **Verified** `GET /pharmacy/notifications`, `POST /pharmacy/notifications/:id/read` |

Screens that stay out of this app: self-registration, password reset, profile edit, order cancel, order edit after submit, partial payment, “pay now”, warehouse picker, driver contact, delivery proof, barcode camera as a requirement, push settings, another pharmacy’s data, admin reports.

---

## 6. Detailed screen specifications

Shared target role for every authenticated screen: **Verified** `PHARMACY` only.

### 6.1 Sign in

| Item | Specification |
| --- | --- |
| Purpose | Exchange the mobile number and password issued by the administrator for an access token, and open the single server session. |
| Fields | Mobile number, required, pattern `+` optional then 8–15 digits. Password, required, 8–128 characters. Password is write-only. |
| Actions | Submit. |
| Success | Store the Bearer token and `expiresIn`. Open the shell. Call `GET /pharmacy/auth/me`. Do not display the token. |
| Failure | Invalid credentials stay on the form. One message for unknown number, wrong password, disabled account, and wrong role. |
| Session | **Verified.** A successful sign-in revokes the previous pharmacy session. The previous device is signed out on its next request. |
| API | `POST /pharmacy/auth/sign-in`. Public. Response: `accessToken`, `tokenType` (`Bearer`), `expiresIn`. |
| Rule | There is no “create account” link. The administrator creates the pharmacy. |

### 6.2 Session ended

| Item | Specification |
| --- | --- |
| Purpose | Return to sign in when the server rejects the token. |
| When | HTTP 401. Causes include sign-in on another device, a future server sign-out, a disabled account, and an expired token. The response does not say which. |
| Show | Sign in, with a short line that the session is no longer active. |
| Data | Discard the token. Keep the unsent working invoice on the device. **Proposed**, so a displaced session does not throw away quantities that were never submitted. |
| Rule | Deleting the token only on the device is not sign-out. Sign-out is section 6.3. |

### 6.3 Shell and sign-out

| Item | Specification |
| --- | --- |
| Purpose | Persistent navigation, the pharmacy name, the working-invoice count, and sign-out. |
| Data | `GET /pharmacy/auth/me`: `id`, `name`, `mobileNumber`, `address`, `status`, `createdAt`, `updatedAt`. No password. |
| Actions | Navigate. Sign out calls the server, then discards the token. **Required** endpoint is not implemented. After sign-out, the same token is rejected. |
| Rule | If `status` is not `ACTIVE`, `JwtAuthGuard` rejects the token. Treat that as session ended. |

### 6.4 Home

| Item | Specification |
| --- | --- |
| Purpose | Resume the working invoice and see what changed, without inventing metrics. |
| Show | The working invoice when it has lines: product count and a way to open it. The newest orders the order endpoint returns. Unread notifications, or a count that opens the list. |
| Most requested | **Required** by the SRS: products this pharmacy requested most often. **Missing** endpoint. The section stays in the layout and shows an empty state until the endpoint exists. Do not rank products in the app by scanning the order list. The SRS does not say whether rejected or undelivered lines count. |
| Empty | No working invoice, no orders yet, no notifications. |
| Do not show | Sales charts, warehouse stock across locations, or another pharmacy. |

### 6.5 Catalog

| Item | Specification |
| --- | --- |
| Purpose | Find a product and add it to the working invoice. |
| Entry | Three categories: `NATIONAL_MEDICINE`, `FOREIGN_MEDICINE`, `ACCESSORY`. Search by name, barcode, and category. |
| Paging | **Required.** Server page, default size 20, maximum 100, plus the total count. Search and the category filter run before the page is cut. Named results are sorted by name. The endpoint is **Missing**. |
| Row | Current image, name, sale unit, pharmacy selling price in `invoiceCurrency`, availability, limited-quantity label when it applies, offer label when the offer is in force. |
| Prices | Show the pharmacy price and the suggested consumer price in the product’s invoice currency only. Default currency is Syrian pound. The other currency stays off this screen. |
| Limited quantity | **Verified** rule. Show “Limited quantity” when the primary warehouse’s available quantity is at or below `lowQuantityThreshold`. The product can still be added when its availability is `AVAILABLE`. |
| Unavailable | **Verified.** The product stays in results with “This product is unavailable” and cannot be added. |
| Disabled | **Proposed.** Hide `DISABLED` products. The submit API rejects them with `PRODUCT_NOT_ORDERABLE`, and the SRS visibility rule is written for unavailable products, not for disabled ones. |
| Quantity shown | Available quantity of the primary warehouse only. Physical quantity, reserved quantity, and the other warehouses stay off this app. |
| Image | The current display URL. An invoice does not store its own copy. |
| Empty search | A successful empty page, with the query still visible. |
| API | **Missing** `GET /pharmacy/products`. The app must not call `GET /admin/products`. |

**Proposed** pharmacy product fields, taken from the SRS display rules and from the data `prepareOrderInvoices` already uses:

| Field | Use |
| --- | --- |
| `id`, `name`, `barcode`, `manufacturerName`, `activeIngredient` | Identity. |
| `imageUrl` | Current image. Null until S3 upload exists. |
| `category`, `saleUnit` | Group and unit. |
| `availability` | `AVAILABLE` or `UNAVAILABLE`. |
| `invoiceCurrency` | `USD` or `SYP`. |
| `pharmacyUnitPrice`, `consumerUnitPrice` | The two prices in that currency, decimal strings. |
| `minimumOrderQuantity`, `maximumOrderQuantity` | Paid-quantity bounds. |
| `availableQuantity` | Primary warehouse only: physical minus reserved. |
| `limitedQuantity` | True when available quantity is at or below the threshold. |
| `offerActive`, `offerPaidUnits`, `offerFreeUnits`, `offerStartsAt`, `offerEndsAt` | Offer preview. The offer is in force only when active and the current time is inside the start and end. |

Fields the pharmacy payload leaves out: `calculateSypFromRate`, the price pair in the other currency, every warehouse stock row, `reservedQuantity`, and `password` material. Those are admin concerns.

### 6.6 Product detail

| Item | Specification |
| --- | --- |
| Purpose | Read one product before adding it. |
| Show | Image, name, manufacturer, active ingredient, barcode, category, sale unit, both prices in the invoice currency, available quantity, limited-quantity or unavailable message, minimum and maximum paid quantity, offer when it is in force. |
| Offer copy | Paid units and free units, for example buy 4 and get 1 free. The offer applies to this product only. |
| Actions | Add to the invoice when `availability` is `AVAILABLE`. If the product is already on the working invoice, the action raises that line’s paid quantity instead of adding a second line. |
| Unavailable | The add action is absent. The product remains readable. |
| API | Same missing catalog endpoint, one product by id. |

### 6.7 Working invoice

| Item | Specification |
| --- | --- |
| Purpose | Hold the products the pharmacy will submit, and let paid quantities change. |
| Persistence | **Proposed** on the device. Leaving the screen, or a 401, keeps the unsent lines. Nothing is sent until submit. |
| Line | Image if the catalog has it, name, sale unit, category, pharmacy unit price, currency, paid quantity, free quantity, line amount. |
| Quantity | An integer. The control stops at `minimumOrderQuantity` and `maximumOrderQuantity`. The value sent later is `paidQuantity`. Free units are calculated, not typed. |
| Free units | When the offer is in force: `floor(paidQuantity / offerPaidUnits) * offerFreeUnits`. Otherwise zero. Free units use the same sale unit. They are included in the quantity that must fit in stock. They are excluded from the maximum and from the line amount. |
| Line amount | Pharmacy unit price multiplied by paid quantity. Decimal string. Currency is the product’s invoice currency. |
| Totals | One total per currency present on the lines. A mixed invoice can show both USD and SYP. Do not convert with an exchange rate. |
| Split preview | Group the lines into the categories that will become invoices: national medicines, foreign medicines, accessories. The order of groups follows the server: national, then foreign, then accessories. |
| Remove | Remove a line from the device. This is not a server cancel. |
| Empty | No products yet, with a way back to the catalog. |
| Duplicate | One line per product. **Verified** on submit: a repeated `productId` fails with `PRODUCT_DUPLICATED`. |
| Limit | At most 100 lines (`MAX_ORDER_LINES`). |
| Stock warning | **Inferred** from submit. When paid plus free is greater than `availableQuantity`, show that the primary warehouse cannot cover the line. Submit would fail with `INSUFFICIENT_STOCK`. |
| API | None until review. |

### 6.8 Review and submit

| Item | Specification |
| --- | --- |
| Purpose | Confirm the working invoice and create the order. |
| Show | The same groups, quantities, free units, and per-currency totals as the working invoice. A short line that the order cannot be changed after it is sent. |
| Action | Submit once. Disable the action while the request is in flight. |
| Success | Replace the working invoice with an empty one. Open the created order. The response is the order with one invoice per category, each invoice `PENDING`. |
| Failure | Stay on review. Keep the lines. Show the server message for the codes in section 9.2. |
| Request | `POST /pharmacy/orders` with `{ items: [{ productId, paidQuantity }] }`. One to 100 items. `paidQuantity` is an integer of at least 1. The server calculates free units, prices, currency, and the primary warehouse. |
| After success | The pharmacy cannot edit or cancel. Another purchase is a new working invoice and a new order. |

### 6.9 Order list

| Item | Specification |
| --- | --- |
| Purpose | Read this pharmacy’s submitted orders. |
| Row | Order id, created time, invoice count, totals per currency, derived status, and each invoice’s category and status. |
| Scope | **Verified.** The server returns only orders whose `pharmacyId` is the signed-in pharmacy. Another pharmacy’s id in a later detail call returns not found. |
| Sort | **Verified.** `listByPharmacyId` orders by id ascending, oldest first. The screen follows that order until the API changes. Newest-first is not a written pharmacy requirement. |
| Paging | The current endpoint returns the full array. Server paging is required for the product list, not for this order list. |
| Search | Not specified for the pharmacy order list. |
| Actions | Open the order. |
| Empty | No orders yet. |
| API | `GET /pharmacy/orders`. |

Derived order status, **Verified**, same function the admin dashboard uses:

| Status | When |
| --- | --- |
| `PENDING` | No invoices, or every invoice is `PENDING`. |
| `COMPLETED` | Every invoice is `REJECTED`, `DELIVERED_PAID`, or `DELIVERED_UNPAID`. |
| `PARTIALLY_DELIVERED` | At least one invoice is in a delivery state, and the order is not completed. Delivery states are `ASSIGNED`, `DELIVERED_PAID`, `DELIVERED_UNPAID`, `NOT_DELIVERED`, `RETURNED_TO_WAREHOUSE`, `OUT_FOR_DELIVERY`. |
| `APPROVED` | Every invoice is `APPROVED`. |
| `PARTIALLY_APPROVED` | Anything else, including a mix of pending, approved, and rejected. |

`PARTIALLY_DELIVERED` is evaluated before `APPROVED`. A mix of approved and assigned invoices is `PARTIALLY_DELIVERED`. `COMPLETED` means every invoice finished by delivery or rejection. It does not mean every invoice was paid. `DELIVERED_UNPAID` still counts as finished.

### 6.10 Order detail

| Item | Specification |
| --- | --- |
| Purpose | See each category invoice of one own order. |
| Header | Order id, created time, derived status, invoice count, totals per currency. The pharmacy name is on the payload and matches the signed-in pharmacy. |
| Invoice summary | Id, category, status, totals, rejection label, custom reason when present. |
| Actions | Open one invoice. No approve, reject, assign, or cancel. |
| API | `GET /pharmacy/orders/:id`. |

### 6.11 Invoice detail

| Item | Specification |
| --- | --- |
| Purpose | Read one category invoice after submission. |
| Header | Invoice id, category, status, totals, parent order id. |
| Rejection | When `rejectionReasonLabel` or `customReason` is present, show it. Both can be empty on a rejected invoice. The administrator may reject with a listed reason, a note, both, or neither. |
| Lines | Product name, barcode, sale unit, paid quantity, free quantity, total quantity, unit price, suggested consumer unit price, currency, line amount, offer paid units, offer free units. These are a snapshot. Later product edits, a new image, and a new exchange rate do not change these numbers. |
| Image | **Verified** absence. The line has no `imageUrl`. Showing the current image means a catalog lookup by `productId`. If that product is no longer in the catalog, the line still shows the snapshotted name, barcode, quantities, and prices. |
| Warehouse | `primaryWarehouseId` is on the line because stock was reserved from it. The pharmacy did not choose it. Leave it off the primary layout. |
| Driver | **Missing.** Status can be `ASSIGNED` or `OUT_FOR_DELIVERY`, and the payload has no driver name, phone, or arrival time. Do not design a driver card. |
| Payment | `DELIVERED_PAID` means the driver collected the full invoice on delivery. `DELIVERED_UNPAID` means the goods were delivered and the amount remains due. The pharmacy does not pay inside this screen. A later admin receipt does not change the invoice status; it covers the invoice on the statement. |
| Status labels | Use section 8.1. The pharmacy has no action on any status. |
| API | The invoice is inside `GET /pharmacy/orders/:id`. |

Invoice statuses the pharmacy can see, **Verified**:

| Status | What it means here |
| --- | --- |
| `PENDING` | Submitted, waiting for the administrator. |
| `APPROVED` | Accepted. Stock is reserved. Not delivered yet. |
| `REJECTED` | Rejected. Other invoices in the order are unchanged. |
| `ASSIGNED` | A driver has the invoice. |
| `OUT_FOR_DELIVERY` | Sent out again after a return to the warehouse. |
| `DELIVERED_PAID` | Delivered and collected. |
| `DELIVERED_UNPAID` | Delivered, amount still due. |
| `NOT_DELIVERED` | The driver recorded non-delivery. |
| `RETURNED_TO_WAREHOUSE` | The invoice went back to the warehouse. |

`NOT_DELIVERED` can include a driver reason (`PHARMACY_CLOSED` or `PAYMENT_UNAVAILABLE`) and a note. Those fields are not on `InvoiceResponse`. The pharmacy sees the status only.

### 6.12 Profile

| Item | Specification |
| --- | --- |
| Purpose | Show the account the administrator created. |
| Show | Pharmacy id, name, mobile number, address, status. |
| Actions | Open the statement. Sign out lives on the shell. |
| Absent | Edit name, mobile number, address, or password. |
| API | `GET /pharmacy/auth/me`. |

### 6.13 Statement

| Item | Specification |
| --- | --- |
| Purpose | Show what this pharmacy owes. Required by the SRS profile: balance and outstanding debts. |
| Show | Per currency: charges, payments, outstanding, and lines. Each line is a charge or a payment, with amount, time, invoice id, and payment id. Separate list of unpaid invoices: invoice id, order id, currency, amount, delivered time, due date, overdue flag. |
| Due date | **Verified** on the admin statement. `dueDate` is the delivery time, and `overdue` is true when that time is already in the past. There is no credit-term field. The screen must not invent “30 days”. |
| Currencies | USD and SYP stay separate. Do not convert outstanding amounts with the current exchange rate. |
| Actions | Open the order from an unpaid row, once the pharmacy statement route exists. The pharmacy does not record a receipt. |
| Empty | No charges and no unpaid invoices. |
| API | **Missing** `GET /pharmacy/statement`. The shape to design against is `PharmacyStatementResponse` in `backend/src/modules/pharmacy-ledger/dto/response/model/pharmacy-statement.response.ts`. That type is returned today only from the admin controller. |

### 6.14 Notifications

| Item | Specification |
| --- | --- |
| Purpose | Read events about this pharmacy’s invoices and payments. |
| List | Id, kind, title, body, resource type, resource id, `readAt`, `createdAt`. |
| Kinds this audience receives | **Verified.** `INVOICE_APPROVED`, `INVOICE_REJECTED`, `INVOICE_ASSIGNED`, `DELIVERY_UPDATED`, `PAYMENT_RECORDED`, `AMOUNT_DUE`. |
| Kind this audience does not receive | `ORDER_SUBMITTED` is created for the administrator when this pharmacy submits. It is not copied to the pharmacy. |
| Action | Mark one as read. Open the invoice’s order when the app can resolve `resourceType: invoice`. Open the statement when it can resolve `resourceType: payment`. Both links are **Missing** as pharmacy routes. |
| Paging | The current endpoint returns the full array. The admin notification list is required to filter by read state and kind. That filter is not written for the pharmacy list. |
| Missing | Mark all read, unread count endpoint, push or SMS. Channel is in-app only. |
| API | `GET /pharmacy/notifications`, `POST /pharmacy/notifications/:id/read`. A notification for another pharmacy returns not found. |

Titles the server writes today, **Verified**:

| Event | Title | Resource |
| --- | --- | --- |
| Invoice approved | Invoice approved | `invoice` |
| Invoice rejected | Invoice rejected | `invoice` |
| Invoice assigned, including send-out again | Invoice assigned | `invoice` |
| Delivery result | Delivery updated | `invoice` |
| Returned to warehouse | Invoice returned | `invoice` |
| Driver collected the invoice | Payment recorded | `payment` |
| Administrator recorded a receipt | Payment recorded | `payment` |
| Delivered without payment | Amount due | `invoice` |

---

## 7. Core user flows

### 7.1 Sign in, including a second device

1. Open sign in. There is no registration.
2. Enter mobile number and password.
3. `POST /pharmacy/auth/sign-in`.
4. Success: keep the token, call `GET /pharmacy/auth/me`, show the shell.
5. The server revokes the previous session before it returns the new token.
6. The previous device keeps its screen until its next request. That request returns 401. The app discards the token and shows session ended. The unsent working invoice stays on that device.
7. Failure: stay on the form. Password is not kept after leaving the screen.

### 7.2 Build an invoice and submit

1. Open a category or search. Results come from the server one page at a time.
2. Open a product. Unavailable products can be read and cannot be added.
3. Add an available product. The working invoice gains one line at the minimum paid quantity, or increases the existing line.
4. Change the paid quantity inside the minimum and the maximum. The screen shows free units when the offer is in force, and a separate total per currency.
5. Review. Submit sends product ids and paid quantities only.
6. Success: the response contains one, two, or three invoices according to the categories on the lines. Each is `PENDING`. The derived order status is `PENDING`. The working invoice is empty. The order detail opens.
7. The pharmacy needs more products later: start another working invoice. The first order stays as submitted.

### 7.3 Follow an invoice

1. Open Orders, then one order.
2. Read each invoice status on its own. One invoice can be approved while another is rejected.
3. Open a rejected invoice to read the reason label and the custom note when the administrator entered them.
4. Later statuses appear after the administrator and the driver act. This app only refreshes them.
5. `DELIVERED_UNPAID` remains money due. Payment is visible on the statement, not as a button on the invoice.

### 7.4 Open a notification

1. Open the list. Unread rows have `readAt` null.
2. Mark the row read with `POST /pharmacy/notifications/:id/read`.
3. An invoice notification should open that invoice inside its order. **Missing** lookup from invoice id to order id.
4. A payment notification should open the statement. **Missing** pharmacy statement route.

### 7.5 Sign out

1. Choose sign out on the shell.
2. Call the server sign-out route. **Required, and Missing.**
3. After success, discard the token and show sign in.
4. A later request with the same token is rejected.
5. The unsent working invoice remains on the device. **Proposed.**

### 7.6 Offer and limits

1. The catalog says the offer is in force: buy 4, get 1 free, inside the start and end.
2. Paid quantity 8 produces free quantity 2 and total quantity 10. The line amount uses 8.
3. Paid quantity 3, below one full set, produces free quantity 0.
4. The maximum applies to the paid quantity. Free units can make the total exceed the maximum.
5. If the total exceeds the primary available quantity, the working invoice warns, and submit returns `INSUFFICIENT_STOCK`.
6. After submit, the invoice line stores the offer units, the prices, and the currency. A later edit of the offer does not change that line.

### Irreversible action

| Action | Why it needs confirmation |
| --- | --- |
| Submit order | Creates the order and its invoices. No edit and no cancel exist. |

No server-side undo was found for submission.

---

## 8. Data requirements

### 8.1 Display formats

| Data | Format |
| --- | --- |
| Money | Decimal string from the API. Show `USD` or `SYP` beside it. One total per currency. |
| Quantities | Integers. Paid, free, and total are separate. The amount uses paid only. |
| Dates | ISO timestamps from the API. Display in the device zone. The business zone is **not specified**. |
| Identifiers | Integer ids. The order id is the order number. The invoice id is the invoice number. There is no separate formatted number. |
| Status | Human language in the interface. The enum value stays in the client logic. |
| Barcode | The product barcode string. Search sends it as text. A camera scanner is **Proposed**, not required. |

**Proposed** English labels for the enums, not a visual style. The same labels should match the admin dashboard so a status means the same thing in both clients:

| Enum | Label |
| --- | --- |
| `NATIONAL_MEDICINE` | National medicines |
| `FOREIGN_MEDICINE` | Foreign medicines |
| `ACCESSORY` | Accessories |
| `PACK` / `BOX` / `SACHET` | Pack / Box / Sachet |
| `AVAILABLE` / `UNAVAILABLE` | Available / Unavailable |
| `PENDING` | Pending review |
| `APPROVED` | Approved |
| `REJECTED` | Rejected |
| `ASSIGNED` | Assigned to a driver |
| `OUT_FOR_DELIVERY` | Out for delivery |
| `DELIVERED_PAID` | Delivered and paid |
| `DELIVERED_UNPAID` | Delivered, unpaid |
| `NOT_DELIVERED` | Not delivered |
| `RETURNED_TO_WAREHOUSE` | Returned to warehouse |
| `PARTIALLY_APPROVED` | Partially approved |
| `PARTIALLY_DELIVERED` | Partially delivered |
| `COMPLETED` | Completed |

UI language itself is an open question. The SRS is written in Arabic and English. The API is English.

### 8.2 Sensitive data

| Data | UI rule |
| --- | --- |
| Password and `passwordHash` | Never display, never echo, never put in a URL. The password field is write-only on sign in. |
| Access token | Store for requests. Do not render it. |
| Other pharmacies | Never request them. A foreign order id returns not found. |
| Warehouse breakdown | Show primary available quantity only, once the catalog exists. |
| S3 credentials | Stay on the server. The app receives a display URL. |

### 8.3 Read-only after submit

| Data | Rule |
| --- | --- |
| Working invoice | Editable only before submit, on the device. |
| Order and invoice lines | Snapshot. Not editable. Not cancellable. |
| Prices on a line | Stay fixed when the product price, the exchange rate, or the invoice currency changes later. |
| Rejection reason | Display only. |
| Profile | Display only. |
| Statement | Display only. |

### 8.4 Offer math the screens must match

**Verified** in `prepare-order-invoices.helper.ts`:

- The offer applies when `offerActive` is true and the current time is between `offerStartsAt` and `offerEndsAt`, inclusive.
- Free quantity is `floor(paidQuantity / offerPaidUnits) * offerFreeUnits`.
- Total quantity is paid plus free.
- The maximum order quantity applies to paid quantity only.
- The stock check applies to total quantity.
- The line amount multiplies the pharmacy unit price by paid quantity.
- The currency and both unit prices come from `invoiceCurrency` at submission: USD uses the USD pair, SYP uses the SYP pair.

---

## 9. API and integration reference

Authentication: Bearer token, role `PHARMACY`, except sign-in. The pharmacy session guard also requires the token’s session to be the active one. Validation failures are HTTP 422. Business-rule failures (`InvalidStateException`) are HTTP 400 with a stable `code`. Unknown ids are HTTP 404. Wrong role is HTTP 403. Missing, bad, expired, or revoked token is HTTP 401.

The app sends `Authorization: Bearer` and does not send a refresh token. No refresh endpoint was found. `expiresIn` is the configured access-token lifetime, currently expressed as a string such as `15m`.

### 9.1 Endpoints that exist

| Method | Path | Body or result |
| --- | --- | --- |
| `POST` | `/pharmacy/auth/sign-in` | `mobileNumber`, `password`. Returns `accessToken`, `tokenType`, `expiresIn`. Public. |
| `GET` | `/pharmacy/auth/me` | `PharmacyResponse`: `id`, `name`, `mobileNumber`, `address`, `status`, `createdAt`, `updatedAt`. |
| `POST` | `/pharmacy/orders` | `{ items: [{ productId, paidQuantity }] }`. Returns `OrderResponse`. |
| `GET` | `/pharmacy/orders` | `OrderResponse[]` for the signed-in pharmacy. |
| `GET` | `/pharmacy/orders/:id` | One `OrderResponse`, or 404 when the order is missing or belongs to another pharmacy. |
| `GET` | `/pharmacy/notifications` | `NotificationResponse[]` for this pharmacy. |
| `POST` | `/pharmacy/notifications/:id/read` | The same notification with `readAt` set. |
| `POST` | `/pharmacy/auth/sign-out` | Revokes the active session. Response is empty, HTTP 204. The same token then returns 401. |
| `GET` | `/pharmacy/products` | One page of active products. Query: `search`, `category`, `limit`, `offset`. |
| `GET` | `/pharmacy/products/most-requested` | One page ranked by this pharmacy’s requested paid quantity. |
| `GET` | `/pharmacy/products/:id` | One product, including a disabled product. |
| `GET` | `/pharmacy/invoices/:id` | One own invoice, or 404 when it belongs to another pharmacy. |
| `GET` | `/pharmacy/statement` | This pharmacy’s statement. |

`OrderResponse` fields: `id`, `pharmacyId`, `pharmacyName`, `status`, `invoiceCount`, `totals[]` (`currency`, `amount`), `invoices[]`, `createdAt`, `updatedAt`.

`InvoiceResponse` fields: `id`, `orderId`, `category`, `status`, `rejectionReasonId`, `rejectionReasonLabel`, `customReason`, `totals[]`, `items[]`, `createdAt`, `updatedAt`.

`InvoiceItemResponse` fields: `id`, `productId`, `productName`, `barcode`, `saleUnit`, `paidQuantity`, `freeQuantity`, `totalQuantity`, `unitPrice`, `consumerUnitPrice`, `currency`, `lineAmount`, `primaryWarehouseId`, `offerPaidUnits`, `offerFreeUnits`, `createdAt`, `updatedAt`.

### 9.2 Submit error codes

| Code | When | Screen |
| --- | --- | --- |
| `PRODUCT_DUPLICATED` | The same product id appears twice. | Working invoice. The UI prevents this by keeping one line. |
| `PRODUCT_NOT_ORDERABLE` | Product status is not `ACTIVE`, or availability is not `AVAILABLE`. | Review. Remove or skip the line. |
| `ORDER_QUANTITY_INVALID` | Paid quantity is outside the minimum and maximum. | The quantity control. |
| `INSUFFICIENT_STOCK` | Paid plus free exceeds the primary available quantity. | The line, before submit. |
| `PRIMARY_WAREHOUSE_MISSING` | The product has no primary warehouse. | Review. The pharmacy cannot fix it. |
| Not found | `productId` does not exist. | Review. |
| 422 | Empty items, more than 100 lines, or a paid quantity below 1. | Review. |

### 9.3 Counting rule for most requested

**Verified.** `requestedQuantity` is the sum of `paidQuantity` on every invoice line this pharmacy submitted, including rejected invoices. The page is ordered by that sum, then by product id. A removed product is left out. A disabled product stays in the ranking and is still readable by id.

### 9.4 Routes this app does not call

`/admin/*`, `/driver/*`, product create and stock edit, exchange rate, receipts, driver settlement, reports, audit.

---

## 10. UI states and edge cases

| Situation | What the screen does |
| --- | --- |
| First launch, no token | Sign in. |
| Token stored, `GET /pharmacy/auth/me` succeeds | Shell. |
| 401 on any call | Session ended. Drop the token. Keep the local working invoice. |
| 403 | Leave the screen. This app does not recover by calling another audience. |
| Catalog loading | The list shows a loading state and does not invent rows. |
| Catalog empty page | Empty state for that category or query. |
| Next page | Ask the server for the next page. Do not append a filtered copy of a full download. |
| Unavailable product | Visible, with the unavailable message, and no add action. |
| Limited quantity | Visible, orderable, with the limited-quantity label. |
| Offer outside its dates | Show the product without the offer. Free quantity is zero. |
| Mixed currencies on one working invoice | Two totals. The submit still creates invoices by category, and each invoice can contain one currency or both if its products differ. |
| Submit in flight | One request. The button does not send a second order. |
| Submit failed | Lines remain. The message names the product when the server message includes it. |
| Submit succeeded | Working invoice clears. Order detail shows the new invoices as pending. |
| Order with one category | One invoice. The other two categories are absent, not shown as empty invoices. |
| Rejected invoice with no reason | Status is rejected. The reason area is empty. |
| `COMPLETED` with an unpaid invoice | Status is completed. The unpaid invoice still shows `DELIVERED_UNPAID` and remains on the statement. |
| Notification for a payment | The body is readable even when the statement route is missing. |
| Image URL null | A placeholder in the catalog and on the working invoice. Invoice history still shows the snapshotted text. |
| Disabled account | Sign in uses the same failure as a bad password. A live token becomes a 401. |
| Offline | **Not specified.** Do not design an offline submit. A local working invoice is only a draft of unsent lines. |
| Very small phone width | One column. Category, price, currency, and unit stay on the product row. |
| Large type | Quantity, price, and status remain visible without horizontal scrolling for the primary action. |

---

## 11. UX and accessibility requirements

These are functional requirements. They are not a color, type, or brand choice.

| Requirement | Expectation |
| --- | --- |
| Phone first | **Inferred.** The SRS calls this a mobile app. Design the primary layout for a phone width. A wider layout may use a second column for the working invoice. No tablet-only requirement is written. |
| One main action | Each screen has one forward action: add, review, submit, or open. Submit is the only irreversible one. |
| Invoice, not a cart | The shell entry is the invoice. Products are added to it. Quantity is paid units of pack, box, or sachet. |
| Money | Currency is visible on every price and total. USD and SYP are never added together. |
| Status | Status is text, with a cue besides color. The same word is used on the order, the invoice, and the notification. |
| Quantity | The control shows the minimum, the maximum, and the current paid quantity. Free quantity is read-only. |
| Touch | Primary actions and the quantity control meet a comfortable touch size. Errors sit next to the field they explain. |
| Loading and saving | Submit stays disabled while the request runs. A failed submit does not clear the invoice. |
| Accessibility | Text alternatives for status and for the limited-quantity and unavailable messages. Visible focus. Contrast that does not depend on a future palette. Errors announced to assistive technology. Target WCAG 2.2 AA as the expectation for the later audit. |
| Language | Do not bake a direction into components in a way that blocks Arabic. **Open:** whether version 1 UI copy is Arabic, English, or both. Pharmacy names and product names may be Arabic while the API enums stay English. |
| Preserve | Category invoices, derived order status, dual currency, snapshot prices, whole-invoice amounts, and the primary-warehouse quantity. Do not redesign these into a cart, a single blended total, a warehouse picker, or a partial-payment form. |

---

## 12. Existing functionality versus gaps

| Area | In the pharmacy API now | Not in the pharmacy API |
| --- | --- | --- |
| Auth | Sign in, single server session, current pharmacy | Server sign-out is required and not built. Password change and self-registration remain absent. |
| Catalog | Submit accepts product ids and enforces availability, limits, offers, and primary stock | The list, search, paging, image URL, and product detail are required and not built. |
| Orders | Submit, list own orders, read one own order, derived status, snapshot lines, rejection text | Edit, cancel, newest-first sort, server paging. |
| Money | Invoice totals and `DELIVERED_UNPAID` on the order | Own statement and outstanding balance. |
| History insight | Lines on past orders include product id and paid quantity | Most-requested ranking. |
| Notifications | Own inbox and mark read, for approval, rejection, assignment, delivery, payment, and amount due | Push, mark all, unread count, a way to open the invoice from the notification. |
| Images | `imageUrl` exists on the admin product | S3 upload, and any pharmacy payload that returns the URL. |
| UI | None | Entire app. |

SRS items that the schema and services have since made concrete, so the design should follow the code when they differ:

| SRS draft | Current code |
| --- | --- |
| Invoice status includes `Draft` | Not in `InvoiceStatus`. The working invoice is local, before `POST /pharmacy/orders`. |
| `Redelivery Pending` | Not in `InvoiceStatus`. Sending an invoice out again sets `OUT_FOR_DELIVERY`. |
| Parent statuses described as a recommendation | Implemented by `deriveOrderStatus`. |
| “Shopping cart” avoided | The client should use invoice for the unsent lines and order for the submission. |
| Notification channel undecided | In-app rows exist for this pharmacy. Push does not. |
| Account statement | Implemented for the administrator and for the signed-in pharmacy at `GET /pharmacy/statement`. |
| One device | Implemented. New sign-in revokes the previous session. The old device finds out on its next request. |

---

## 13. Open questions

| Question | Why it matters |
| --- | --- |
| Is the app UI Arabic, English, or both? | Layout direction, labels, and mixed product names. |
| Should the pharmacy order list be newest first? | The API returns oldest id first. Daily use usually wants the latest order at the top. |
| Does the pharmacist need the driver name once an invoice is assigned? | The current order payload has no driver. Adding it is a product change. |
| Is “overdue” immediately after delivery the rule to display? | The statement behaves that way. A credit period would be a product change. |
| Phone only, or phone and tablet? | The SRS says mobile and does not mention a tablet layout. |
| Should the unsent invoice survive reinstall, or only the current installation? | There is no server draft. Device storage is a client choice. |

---

## 14. Screens to design first

Design only after a direction is chosen, and design in this order. Each step is usable with the current API except where noted.

| Order | Screens | Reason |
| --- | --- | --- |
| 1 | Sign in, session ended, and shell, including server sign-out | `POST /pharmacy/auth/sign-out` revokes the session. |
| 2 | Catalog list, search, and product detail | `GET /pharmacy/products` pages and searches on the server. The image is the current `imageUrl`. The S3 upload is still an admin gap. |
| 3 | Working invoice, review, and submit | Core daily work. Submit is already implemented. The lines it displays come from the catalog. |
| 4 | Order list, order detail, and invoice detail | Read-only. `GET /pharmacy/invoices/:id` opens the invoice from a notification. |
| 5 | Notifications | The list and mark-read are implemented. An invoice notification can open `GET /pharmacy/invoices/:id`. A payment notification can open the statement. |
| 6 | Profile and statement | `GET /pharmacy/auth/me` and `GET /pharmacy/statement`. |
| 7 | Home, including most requested | `GET /pharmacy/products/most-requested` ranks by submitted paid quantity, including rejected invoices. |

Do not start Figma with a visual system that assumes self-registration, a shopping cart, order editing, in-app payment, a warehouse picker, or push notifications. Those are not in the current product.

---

## 15. Analysis limits

- Reviewed the pharmacy controllers, the order and notification services they call, invoice and statement response types, order-status derivation, offer math, the session guard, and the SRS pharmacy sections.
- No pharmacy UI routes exist to inventory. No `pubspec.yaml` exists.
- The admin product response was used to see which fields exist in the database. It is not a payload this app may call.
- Exact copy of every 400 message is in the service that throws it. Section 9.2 is the set a designer needs for states.
- This file does not change application code, schema, or API behavior.

---

## 16. Requirements added on 5 November 2026

These items are version-1 requirements in `docs/srs-en.md` and `docs/srs-ar.md`. Catalog paging, search, and pharmacy sign-out are implemented. The product file upload to Amazon S3 is not.

### 16.1 Server-side paging and search for products

Design the catalog with a search field, a category filter, a page control, and the total count. The server searches and filters before it cuts the page. The client does not download every product.

| List | Search | Filters | Sort |
| --- | --- | --- | --- |
| Pharmacy products | Name, barcode, and category | Category, which is also how the pharmacist browses | By name |

Default page size is 20. Maximum page size is 100. A paged response contains the rows, the page number, the page size, and the total count.

The pharmacy order list and the pharmacy notification list are not named in that paging requirement. Their current endpoints return full arrays.

### 16.2 Product image

- The administrator uploads one JPEG, PNG, or WebP file, at most 5 MB, to Amazon S3.
- The pharmacy app shows the current display URL on the catalog, the product, and the working invoice.
- Replacing the image removes the previous file. A failed replacement keeps the previous image.
- An invoice line does not store the image. History shows the current image only while a catalog lookup by `productId` still returns one.
- S3 credentials never appear in the app.
- The current API stores an optional `imageUrl` string on the admin product and has no upload. `GET /pharmacy/products` returns that URL when it is set.

### 16.3 Server-side sign-out

The shell sign-out action calls `POST /pharmacy/auth/sign-out`, then drops the token. After a successful sign-out, the same access token is rejected. Clearing the token only on the device does not meet this requirement.

Sign-in on a second device already revokes the previous session. That behavior is implemented and is separate from the sign-out button.
