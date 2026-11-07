# Software Requirements Specification (SRS)

## Pharmacy and Warehouse Distribution Management System

**Project name:** Pharmacy & Warehouse Distribution Management System  
**Version:** 1.0 — Requirements draft  
**Document status:** Based on the collected requirements. Updated 5 November 2026 with server-side list paging and search, a required product image stored in Amazon S3, and server-side sign-out.

---

## 1. Project Introduction

### 1.1 Purpose

Build a digital system for distributing national medicines, foreign medicines, and accessories from warehouses to pharmacies. The project acts as an intermediary that manages products, stock, orders, invoices, driver assignments, collection, and outstanding debts.

### 1.2 Main Systems

The system has three parts:

1. **Admin Dashboard:** For managing pharmacies, drivers, products, warehouses, orders, invoices, stock, accounts, and reports.
2. **Pharmacy Mobile App:** For signing in, browsing products, creating invoices, submitting orders, tracking them, and reviewing order history.
3. **Driver Mobile App:** For viewing assigned tasks, delivering invoices, and recording the delivery result, the collection result, or the reason for non-delivery.

### 1.3 System Users

- System administrator.
- Admin staff, according to permissions that will be defined later.
- Registered pharmacies.
- Registered drivers.

**Warehouses:** Warehouses do not have an app or an account in the system. The administrator updates stock from information received from warehouse owners.

---

## 2. Project Scope

Version 1 includes:

- Managing products and stock in more than one warehouse for the same product, with one primary warehouse.
- Managing three product categories.
- Managing manufacturers as a separate entity selected when a product is added.
- Managing prices in US dollars and Syrian pounds, with a central exchange rate, offers, and order limits.
- Managing pharmacy and driver accounts.
- Creating orders that contain one or more invoices.
- Splitting each order into separate invoices by product category.
- Approving or rejecting invoices.
- Assigning invoices to drivers.
- Tracking delivery and collection.
- Following accounts, debts, and payments.
- Processing returned invoices and sending them out again.
- Order history and most requested products.
- Basic reports and notifications.
- Server-side paging and search for the admin lists and for the pharmacy product list.
- One product image per product, uploaded from the admin dashboard and stored in Amazon S3.
- Server-side sign-out for the administrator, the pharmacy, and the driver.

Version 1 does not include medicine expiry dates, batch numbers, a warehouse app, proof of delivery by signature or photo, or editing orders after they are submitted.

---

## 3. Key Terms

| Term | Definition |
| --- | --- |
| Product | A medicine or accessory registered in the system |
| Manufacturer | A separate entity added from the admin dashboard and selected when a product is created |
| Sale Unit | The unit used to order a product. The allowed values are Pack, Box, and Sachet |
| Warehouse | The location where a product quantity is recorded |
| Primary Warehouse | The warehouse used to display and reserve a product’s quantity. If a product has only one warehouse, that warehouse is primary automatically |
| Exchange Rate | The value of one US dollar in Syrian pounds, managed from the admin dashboard |
| Invoice Currency | The currency used to display a product price and store it on the invoice: US dollar or Syrian pound |
| Pharmacy | The party that orders products and receives them |
| Order | The set of invoices produced by one pharmacy request |
| Invoice | A separate document tied to one product category |
| Available Stock | The quantity that can be allocated to new orders |
| Reserved Quantity | The quantity allocated to approved invoices |
| Collection | The amount received against an invoice |
| Returned Invoice | An invoice whose delivery path was not completed, or that was sent back for processing |

---

## 4. Product Types and Categories

The system must support only three main categories in version 1:

1. National Medicines.
2. Foreign Medicines.
3. Accessories.

### 4.1 Product Data

A product record must contain the following fields:

- Unique product identifier.
- Product name.
- Barcode.
- Category.
- Product image, required. The administrator uploads one image file. The server stores the file in Amazon S3.
- Manufacturer, selected from the manufacturers registered in the admin dashboard.
- Active ingredient.
- Sale unit, limited to one of these values: Pack, Box, or Sachet.
- Warehouses linked to the product, with an independent quantity for each warehouse.
- Primary warehouse. If the product is linked to only one warehouse, that warehouse is set as primary automatically.
- Minimum quantity that can be ordered.
- Maximum quantity that can be ordered.
- Pharmacy selling price in US dollars and in Syrian pounds.
- Suggested consumer selling price in US dollars and in Syrian pounds.
- Option to calculate the Syrian-pound price from the exchange rate, or to enter it as a fixed amount.
- Invoice currency: US dollar or Syrian pound. The default is the Syrian pound.
- Availability status: available or unavailable.
- Low-quantity alert threshold.
- Offer data, when an offer exists.

### 4.2 Manufacturers

A manufacturer is a separate entity managed from the admin dashboard. When a product is added or edited, the manufacturer is selected from the registered list and is not entered as free text.

The administrator can:

- Add a manufacturer.
- Edit a manufacturer’s data.
- Activate or deactivate a manufacturer.

### 4.3 Product Management

The administrator must be able to:

- Add a new product.
- Edit product data.
- Select the manufacturer from the registered list.
- Set the active ingredient.
- Set the sale unit from the approved options: Pack, Box, or Sachet.
- Link the product to one or more warehouses and set the quantity of each warehouse.
- Assign the primary warehouse, while keeping only one primary warehouse.
- Manually adjust each warehouse quantity when new information arrives from the warehouse owner.
- Enter prices in US dollars and Syrian pounds.
- Turn on Syrian-pound calculation from the exchange rate, or keep the Syrian-pound amount fixed.
- Choose the product’s invoice currency.
- Edit prices and order limits.
- Activate a product or stop it from being ordered.
- Change the availability status.
- Set the threshold for the “Limited quantity” alert.
- Upload the product image, and replace it later.

The system does not currently require detailed records of goods receipts, damaged goods, batch numbers, or expiry dates.

### 4.4 Multiple Warehouses

One product can be linked to more than one warehouse without duplicating the product definition. Each product-and-warehouse relationship has its own quantity.

Each product has one primary warehouse:

- The administrator chooses it when the product is linked to more than one warehouse.
- If the product is linked to only one warehouse, that warehouse is assigned as primary by default.
- The administrator can change the primary warehouse later.
- A product cannot have more than one primary warehouse at the same time.

The quantity available for ordering is displayed and reserved from the primary warehouse stock. The identity of that warehouse is stored on the invoice when the order is submitted, so a later change of the primary warehouse does not change old invoices.

### 4.5 How a Product Appears in the Pharmacy App

- The current product image is shown with the product.
- If the product is available and within the order limits, it can be added to the invoice.
- If the primary warehouse quantity is at or below the alert threshold, a “Limited quantity” alert is shown.
- If the product is unavailable, it remains visible in search with the message “This product is unavailable,” and it cannot be added to the invoice.
- The name “shopping cart” is not used. The group of products prepared by the pharmacy is called an invoice, because that name is closer to how pharmacists work, and products are added directly to it.

### 4.6 Product Image

Each product has exactly one image.

- The administrator uploads the image from the admin dashboard when the product is created.
- The administrator can replace the image later. The previous file is removed from storage.
- The server stores the file in Amazon S3. The database stores the location needed to display the image, not the file bytes.
- S3 credentials stay on the server. The dashboard and the mobile apps receive a display URL only.
- Accepted types are JPEG, PNG, and WebP. The maximum file size is 5 MB.
- If the upload fails while creating a product, the product is not saved.
- If a replacement upload fails, the previous image stays in place.
- The pharmacy app shows the current image. An invoice does not keep its own copy of the image. Replacing the image does not change prices already stored on an invoice.

---

## 5. Price and Offer Management

### 5.1 Prices

Pharmacy selling prices must be the same for all pharmacies in version 1.

Each product has two prices:

- The selling price charged to the pharmacy.
- The suggested price for the pharmacy to charge the consumer.

These two prices must be separated from the prices stored on an invoice. Changing the pharmacy selling price or the suggested consumer price on the product later does not change old invoices.

### 5.2 Currencies and Exchange Rate

The two currencies used for product prices and invoices are:

- US dollar.
- Syrian pound.

The system provides one exchange-rate setting in the admin dashboard: the value of one US dollar in Syrian pounds. The administrator can change this value.

Each product has a US-dollar price and a Syrian-pound price, for both the pharmacy selling price and the suggested consumer price.

A switch next to the Syrian-pound price determines how that price is calculated:

- When the switch is on, the Syrian-pound price is calculated from the US-dollar price using the current exchange rate. When the exchange rate changes, the Syrian-pound price of this product changes.
- When the switch is off, the administrator enters the Syrian-pound price manually. It stays fixed and is not affected by exchange-rate changes.

Each product has a radio choice for the currency used to display the price and record it on the invoice:

- US dollar.
- Syrian pound.

The default value is the Syrian pound.

The invoice stores the selected currency and the amounts calculated at submission time. A later change to the exchange rate, product prices, invoice currency, or calculation switch does not change old invoices.

### 5.3 Offers

The system must support an optional offer at the product level, for example:

**Buy 4 packs and get the fifth pack free.**

Offer data:

- Turn the offer on or off.
- Number of paid units required.
- Number of free units.
- Offer start date.
- Offer end date.

In version 1, an offer applies to the selected product itself. Offers do not cover a whole category or a group of different products.

### 5.4 Applying an Offer to an Invoice

When the quantity required to benefit from the offer is added:

- The system calculates the paid quantity and the free quantity.
- It shows the offer details and the final quantity for the pharmacy.
- The offer details, price, currency, and quantity are stored on the invoice, so an old invoice does not change if the offer or the exchange rate is edited later.
- Free units are included in the quantity allocated from stock.
- Free units are not counted toward the maximum order quantity. The maximum applies to paid units only.

---

## 6. Warehouse and Stock Management

### 6.1 Warehouse Definition

The administrator can:

- Add a new warehouse.
- Edit warehouse data.
- View the products linked to it.
- View the recorded quantity of each product.

The warehouse owner does not need to sign in or use the app.

### 6.2 Stock Updates

Each warehouse quantity is updated manually from the admin dashboard when the administrator receives new information from warehouse owners. Changing one warehouse quantity does not change the quantities of the same product in other warehouses.

The system must support editing the current quantity of each warehouse directly, and must record the new value and the date of the change. Recording the user who made the change is recommended, so the change can be reviewed.

### 6.3 Reserving Stock on Approval

The adopted decision is that quantity is reserved or deducted when the invoice is approved.

Requirements:

1. When an invoice is approved, the required quantity is allocated from the stock of the primary warehouse recorded on the invoice.
2. The allocated quantity must not exceed the quantity available for ordering.
3. The available quantity must be updated so another invoice cannot be approved using the same quantity.
4. The quantity must not be deducted a second time at delivery if it was already counted at approval.
5. Rejecting an invoice before the quantity is allocated does not deduct any quantity.
6. The mechanism for returning quantity to stock must be defined when delivery does not happen or the invoice is returned to the warehouse.

**Proposed rule:** Separate physical stock, reserved stock, and available stock, so available quantity = physical stock − reserved stock. On actual delivery, reserved quantity becomes issued quantity without a second deduction.

---

## 7. Pharmacy Account Management

### 7.1 Account Creation

The administrator creates the pharmacy account from the admin dashboard and sets its sign-in data.

### 7.2 Sign-In

- Sign in with mobile number and password.
- The account may have an active session on one device only.
- Signing in from a new device ends the previous session and signs out the old device.
- Ending the previous session must be enforced on the server, not only by deleting local data from the app.
- The pharmacy can sign out. Sign-out revokes the active server session, and the same access token is rejected afterward.

### 7.3 Pharmacy Profile

The profile must include, at a minimum:

- Pharmacy identifier.
- Pharmacy name.
- Mobile number.
- Address and delivery information.
- Account status.
- Order and invoice history.
- Financial balance and outstanding debts.

---

## 8. Pharmacy App

### 8.1 Browsing and Search

The app must allow the user to:

- Browse products by category.
- Search by product name.
- Search by barcode.
- View the product image, the pharmacy selling price, and the suggested consumer price in the invoice currency selected for the product, together with the primary warehouse quantity, sale unit, and availability status.
- Browse and search through server-side pages. The search covers name, barcode, and category, and it is applied before the page is cut.
- Show a “Limited quantity” label when the condition is met.
- Prevent an unavailable product from being added to the invoice.

### 8.2 Creating an Invoice

The pharmacy can add products to the invoice and change quantities before submitting the order.

Minimum and maximum order limits, stock, and offers must be checked before submission.

After the order is submitted, the pharmacy cannot edit it. If more products are needed, the pharmacy can create a new order.

### 8.3 Splitting an Order into Invoices

One order may produce:

- One invoice if it contains one category.
- Two invoices if it contains two categories.
- Three invoices if it contains all three categories.

Each invoice must contain only one category:

- National medicines invoice.
- Foreign medicines invoice.
- Accessories invoice.

All invoices share the same parent order identifier, while each invoice keeps its own identifier, status, and amount.

### 8.4 Order History

The user must be able to:

- View previous orders.
- Open the details of each order and its invoices.
- View invoice statuses and rejection reasons.
- Review the products, quantities, and prices ordered before.
- See the most requested products based on the pharmacy’s own purchase history.

---

## 9. Order and Invoice Management in the Admin Dashboard

### 9.1 Order List

The admin dashboard shows all orders received from pharmacies, with:

- Order number.
- Ordering pharmacy.
- Order date.
- Number of invoices.
- Total order value.
- Aggregated order status.
- Status of each invoice separately.

The order list is paged and searched on the server. Search covers the order number and the pharmacy name. The list can be filtered by derived status and by order date. The server applies the search and the filters before it cuts the page.

### 9.2 Invoice Review

The staff member reviews each invoice and checks product availability at the warehouse before approving it.

The review result can be:

- Approve the invoice.
- Reject the invoice.

Invoices in the same order do not have to share the same status. One invoice can be accepted and another rejected within the same order.

### 9.3 Rejection Reasons

Three options must be available:

1. Choose a reason from a fixed list managed by the administrator.
2. Write a custom reason in a free-text field.
3. Reject the invoice without giving a reason.

If a rejection reason exists, it must be shown to the pharmacy in the invoice details.

### 9.4 Editing and Cancelling Orders

- The pharmacy cannot edit an order after it is submitted.
- The current requirements do not include a way to cancel an order after it is submitted.
- If the pharmacy needs other products, it can submit a new order.
- Rejection is handled at the invoice level. Rejecting one invoice does not automatically reject the other invoices in the order.

---

## 10. Invoice Status and Order Status

### 10.1 Invoice Statuses

The proposed base statuses are:

| Status | Description |
| --- | --- |
| `Draft` | The invoice is being prepared and has not been submitted |
| `Pending` | The invoice has been submitted and is waiting for review |
| `Approved` | The invoice has been approved |
| `Rejected` | The invoice has been rejected |
| `Assigned` | The invoice has been assigned to a driver |
| `Out for Delivery` | The invoice is out for delivery |
| `Delivered – Paid` | Delivered and the amount was collected |
| `Delivered – Unpaid` | Delivered without collecting the amount |
| `Not Delivered` | Not delivered |
| `Returned to Warehouse` | The invoice was returned to the warehouse |
| `Redelivery Pending` | Waiting to be sent out for delivery again |

This list combines the requested statuses and adds proposed operational statuses for preparation, assignment, and redelivery. The allowed transitions between them must be defined before implementation.

### 10.2 Parent Order Statuses

**Design recommendation:** The parent order status is not managed manually as an independent status. It is calculated from the statuses of its invoices.

The proposed aggregated statuses are:

- `Pending` — all invoices are waiting for review.
- `Partially Approved` — some invoices are accepted and others are rejected or still under review.
- `Approved` — all invoices that can be processed have been approved.
- `Partially Delivered` — some invoices have been delivered, while others are still out for delivery or were not delivered.
- `Completed` — processing of all invoices has finished, whether by delivery or by final rejection under the adopted business rules.

The parent order status must not be treated as proof that every invoice has been paid. Payment is tracked on each invoice.

---

## 11. Driver App

### 11.1 Assigned Tasks

The app shows the driver the pharmacies to visit and the invoices linked to each pharmacy.

The current version does not require a mandatory delivery-route order or a route-optimization system.

### 11.2 Delivery Task Data

The driver must see:

- Pharmacy name.
- Address and the contact information needed for delivery.
- Order number.
- Invoices linked to the order.
- Category of each invoice.
- Value of each invoice.
- Amount to collect, when there is one.
- Current invoice status.

### 11.3 Delivery Result

For each invoice, the driver can record one result:

1. **Delivered and the amount was collected (`Delivered – Paid`).**
2. **Delivered without collecting the amount (`Delivered – Unpaid`).**
3. **Not delivered (`Not Delivered`).**

The result is recorded for each invoice independently, even if the pharmacy’s other invoices were delivered, rejected, or not delivered.

### 11.4 Reasons for Non-Delivery

A fixed list of reasons must be available and must include at least:

- The pharmacy is closed.
- The pharmacy does not have the amount required for payment.

An extra note may be allowed when needed.

### 11.5 Delivery Data

When delivery is recorded, the system stores:

- Delivery date and time.
- Name of the person who received the goods.
- Responsible driver.
- Financial collection result.

The current version does not include the recipient’s signature or photo proof of delivery.

### 11.6 Driver Permissions

- The driver cannot reject the task.
- The driver cannot request reassignment of the task from the app.
- There is no mandatory proof of delivery by photo or signature.
- The driver records the collection status using the action available for each invoice.
- The driver can sign out. Sign-out is enforced on the server, and the same access token is rejected afterward.

---

## 12. Pharmacy Financial Accounts

### 12.1 Account Statement

Each pharmacy must have an account statement that includes:

- Previous balance.
- Invoices posted to the pharmacy.
- Payments received.
- Paid and unpaid invoices.
- Outstanding balance.
- Overdue debts and their due dates.

### 12.2 Payment at Invoice Level

The system does not allow a partial payment to be recorded against an invoice under the current requirements.

A pharmacy can pay one invoice from a multi-invoice order while another invoice remains unpaid.

Example:

- National medicines invoice: delivered and paid.
- Foreign medicines invoice: delivered and unpaid.

Both states and the amount due on each invoice must be recorded independently.

### 12.3 Invoices Delivered without Payment

When an invoice is delivered without collecting the amount:

- The delivery status is recorded.
- The amount remains due from the pharmacy.
- The amount appears on the pharmacy account statement.
- The invoice is not treated as paid only because the goods were delivered.

### 12.4 Receipt Vouchers

The administrator must be able to record a receipt voucher that contains:

- Voucher number.
- Pharmacy concerned.
- Amount received.
- Date and time of receipt.
- Person who received the amount.
- Payment method, if one has been adopted.
- Invoice or invoices covered by the voucher.

How the amount is distributed across invoices must be checked, while keeping the version 1 rule that an invoice cannot be paid partially.

---

## 13. Driver Financial Accounts

The admin dashboard must make it possible to review:

- Number of invoices assigned to each driver.
- Invoices delivered and collected.
- Invoices delivered without collection.
- Invoices that were not delivered.
- Total amounts collected.
- Amounts handed over to the administration.
- Amounts still held by the driver, when any remain.

The system must support recording the handover of money from the driver to the administration, including the date, the amount, and the person who received it.

---

## 14. Returns and Redelivery

The admin dashboard must include a section for returned invoices.

The administrator can change a returned invoice to one of these statuses:

- `Returned to Warehouse` — the invoice has returned to the warehouse.
- `Out for Delivery` — the invoice has been sent out for delivery again and continues the delivery cycle.

A history of status changes and their dates must be kept.

**Proposed rule that still needs approval:** When an invoice is returned to the warehouse, the quantity is updated according to whether the goods actually came back, and the quantity must not be added to stock twice. If the invoice is sent out again, it must be clear whether that continues the original billing document or creates a new delivery task linked to the same invoice.

---

## 15. Reports and Notifications

### 15.1 Sales Reports

The admin dashboard must show total sales for a selected period, such as a day or a month, with the ability to filter by pharmacy or product category. Sales are calculated using the currency recorded on each invoice.

### 15.2 Product and Stock Reports

- Best-selling products.
- Slowest-moving products.
- Products that have reached the limited-quantity threshold.
- Unavailable products.
- Quantities recorded for each warehouse.

The current version does not require expiry-date tracking.

### 15.3 Debt Reports

- Balance of each pharmacy.
- Unpaid invoices.
- Overdue amounts.
- Payments recorded during a period.
- Total amounts due from pharmacies.

### 15.4 Driver Reports

- Number of delivered invoices.
- Number of undelivered invoices.
- Delivered and paid invoices.
- Delivered and unpaid invoices.
- Amounts collected and amounts handed over to the administration.

### 15.5 Notifications

The system must support notifications for the basic events:

- A new order arrives.
- An invoice is approved or rejected.
- An invoice is assigned to a driver.
- The delivery status is updated.
- A payment is recorded, or the amount remains due.

The notification channel, such as in-app notifications or push notifications, needs to be decided before implementation.

---

## 16. Non-Functional Requirements

### 16.1 Security

- Pharmacy and driver accounts must be protected.
- Passwords must be stored securely and must not be stored as plain text.
- Access permissions must be enforced on the server.
- A user must not be able to view another pharmacy’s invoices or accounts.
- The previous session must be ended when the user signs in from a new device.
- The administrator, the pharmacy, and the driver can sign out. Sign-out invalidates the current server session. A later request that still presents the same access token is rejected. Deleting the token only on the device is not enough.
- Important operations that affect stock, invoices, and accounts must be logged.

### 16.2 Data Integrity

- Every order, invoice, product, pharmacy, and driver must have a unique identifier.
- Every invoice must be linked to one parent order.
- The same quantity must not be allocated to multiple invoices.
- A duplicate collection must not be recorded because the same technical request was submitted again.
- Prices on old invoices must stay fixed.
- Stock edits and payments must remain reviewable.

### 16.3 Performance

Name, barcode, and category search must be fast enough for daily use. Search and paging run on the server. A client must not download a full list and then search it locally.

A paged response contains the rows for the requested page, the page number, the page size, and the total count. The default page size is 20. The maximum page size is 100. The server uses a stable sort: orders are newest first, and named catalogs are sorted by name.

These admin lists must be paged and searched on the server:

| List | Search | Filters |
| --- | --- | --- |
| Products | Name, barcode, active ingredient | Category, availability, status |
| Orders | Order number, pharmacy name | Derived status, order date |
| Warehouses | Name | — |
| Manufacturers | Name | Status |
| Pharmacies | Name, mobile number | Status |
| Drivers | Name, mobile number | Status |
| Rejection reasons | Label | Status |
| Notifications | — | Read state, notification kind |

The pharmacy product list uses the same paging contract. Its search remains name, barcode, and category.

### 16.4 Scalability

The system must be designed so that detailed staff permissions and additional stock-management features can be added later without rebuilding the system. Support for more than one warehouse per product, with an independent quantity and a primary warehouse, is part of version 1.

---

## 17. Basic Acceptance Criteria

Version 1 meets the basic requirements when the following scenarios are true:

1. The administrator can create a warehouse and add a manufacturer, then add a product, select the manufacturer from the list, link it to one or more warehouses, set each warehouse quantity, assign the primary warehouse, set its prices in US dollars and Syrian pounds, and set its category, active ingredient, and sale unit.
2. The administrator can manually edit the quantity of each warehouse. If the product has one warehouse, that warehouse is the primary warehouse automatically.
3. A pharmacy can sign in from one device only, and signing in from another device invalidates the previous session.
4. A pharmacy can search for products by name, barcode, and category.
5. An unavailable product cannot be added to the invoice.
6. The system can apply order limits and offers at the product level, and free units are not counted toward the maximum order quantity.
7. A pharmacy order produces one, two, or three invoices according to the requested categories.
8. The administrator can approve one invoice and reject another invoice in the same order.
9. When an invoice is approved, the required quantity is reserved from the primary warehouse recorded on it and cannot be allocated again.
10. A pharmacy can see the statuses of its invoices and the rejection reasons.
11. The administrator can assign invoices to drivers.
12. A driver can record delivery with payment, delivery without payment, or non-delivery with a reason.
13. The system can keep the amounts due from pharmacies and show them on the account statement.
14. The administrator can record receipt vouchers and settle the amounts held by drivers.
15. The administrator can follow returned invoices, return them to the warehouse, or send them out for delivery again.
16. Previous invoice prices and their currency stay fixed when product prices, the exchange rate, or the invoice currency change.
17. The administrator can view the basic reports for sales, products, stock, debts, and drivers.
18. The administrator can set the US-dollar exchange rate against the Syrian pound. If Syrian-pound calculation is enabled for a product, its Syrian-pound price changes with the exchange rate. If it is disabled, the Syrian-pound price stays fixed.
19. Product prices are displayed and recorded on the invoice in the currency the administrator chose for the product. The default is the Syrian pound.
20. The administrator uploads one product image. The file is stored in Amazon S3, the pharmacy app shows that image, and replacing the image removes the previous file.
21. Admin lists for products, orders, warehouses, manufacturers, pharmacies, drivers, rejection reasons, and notifications, and the pharmacy product list, return one server-side page plus the total count. Search and filters are applied before the page is cut.
22. The administrator, the pharmacy, and the driver can sign out. After sign-out, the same access token is rejected by the server.

---

## 18. Summary

The purpose of the system is to manage a full distribution cycle: define the product and its stock, receive the pharmacy order, split the order into invoices by category, review and approve or reject the invoices, assign them to drivers, record delivery and collection, and follow outstanding amounts, returns, and reports.

The main design rule is that **the order groups the invoices, while stock, delivery, financial collection, and delivery status are managed at the invoice level**. The parent order status is a summary of the statuses of all of its invoices.

This document is the version 1 SRS draft.
