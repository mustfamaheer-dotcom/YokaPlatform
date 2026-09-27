# Nurdz Coins & Store — Final Implementation Plan

## Decisions Locked ✅

| # | Decision | Answer |
|---|---|---|
| Q1 | Wallet scope | **Per-subject** — coins earned in Subject A cannot be spent in Subject B |
| Q2 | Score events | **All score types** (assignment, exam, quiz) — 1 coin per 1 score point |
| Q3 | Nickname customization | Student can customize **name + color one time only** at purchase/redeem. Thereafter locked until teacher re-enables a new purchase |
| Q4 | Avatar frame default | **No frame by default** — frame appears only after redeeming an avatar item |

---

## Overview

A gamified economy system for TheNurdz platform where:
- Students earn **Nurdz Coins** automatically — **1 coin per 1 score point** — on every score save (assignment, exam, or quiz). Each coin batch expires **60 days** after it is added.
- Coins are **per-subject** — each teacher's store is isolated. Coins earned in Subject A can only be spent in Subject A's store.
- Students visit a **Store** (per subject) to browse and redeem items the teacher has added.
- Teachers manage the store from a new **"Store & Redeems"** module in their dashboard.
- Store items include: **PDFs, Discounts, Gift Cards, Avatars, Nicknames**, or anything else the teacher defines.
- **Avatars**: Redeemed avatar frames appear on the student's profile icon and on the scoreboard. No frame is shown unless a student has redeemed one.
- **Nicknames**: Teacher creates a nickname item. If `nicknameCustomizable = true`, the student can set their own name + pick a color **once at the moment of purchase**. After that it is locked until the teacher adds a new purchaseable nickname slot.
- Teachers see a full **Transactions Log** showing every purchase with all details.
- The system is **tamper-proof**: all purchases happen server-side, coins are append-only, balances filtered server-side for expiry.

---

## Firebase Data Architecture

All new data lives under the existing per-subject teacher path to maintain isolation.

```
Subjects/
  {subjectId}/
    Teachers/
      {teacherId}/

        StoreItems/                        (Teacher-managed catalog)
          {itemId}/
            title: string
            description: string
            price: int                     (Nurdz Coins)
            imageUrl: string               (Firebase Storage thumbnail)
            type: "pdf" | "discount" | "giftcard" | "avatar" | "nickname" | "other"
            isActive: bool
            avatarFrameUrl: string?        (type=avatar only — frame overlay image)
            nicknameCustomizable: bool?    (type=nickname — true = student sets name+color once)
            nicknameValue: string?         (type=nickname — teacher's fixed text if not customizable)
            pdfUrl: string?                (type=pdf only)
            discountCode: string?          (type=discount / giftcard)
            createdBy: string
            creationDate: DateTime

        StudentWallets/                    (Per-student coin ledger — append-only)
          {studentId}/
            Coins/
              {coinId}/
                amount: int                (= score points, e.g. score of 8 = 8 coins in one entry)
                source: string             ("assignment_{id}" | "quiz_{id}" | "exam_{id}")
                earnedDate: DateTime
                expiryDate: DateTime       (earnedDate + 60 days)
                isSpent: bool              (true after deduction — never deleted)

        Transactions/                      (Immutable purchase log — never deleted)
          {txId}/
            studentId: string
            studentName: string
            itemId: string
            itemTitle: string
            itemType: string
            coinsSpent: int
            transactionDate: DateTime
            status: "completed" | "failed"
            redeemedValue: string?         (PDF URL, coupon code, etc.)
            chosenNickname: string?        (set by student at purchase if nicknameCustomizable)
            chosenNicknameColor: string?   (hex color chosen by student at purchase)

        StudentRewards/                    (Active rewards per student)
          {studentId}/
            activeAvatarItemId: string?
            activeAvatarFrameUrl: string?
            nickname: string?              (active display nickname)
            nicknameColor: string?         (hex color for nickname display)
            nicknameItemId: string?        (which store item granted this nickname)
```

> [!NOTE]
> **Coin ledger is append-only.** Coins are never deleted — they are marked `isSpent = true`.
> Available balance = `SUM(amount WHERE isSpent == false AND expiryDate > UtcNow)`.
> Spending deducts from the earliest-expiring coins first (FIFO by expiry date).

> [!NOTE]
> **Nickname one-time customization flow**: At the moment the student clicks "Redeem" on a `nicknameCustomizable` item, a dialog appears with a text field (name) and a color picker. The student submits → both are saved to `Transactions.chosenNickname / chosenNicknameColor` and `StudentRewards.nickname / nicknameColor`. The item is then marked purchased and the student cannot change it again unless they buy another nickname slot.

---

## Proposed Changes

---

### Layer 1 — Domain Models (`TheNurdz.Domain`)

#### [NEW] [Store.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Domain/Models/Store.cs)

```csharp
namespace TheNurdz.Domain.Models;

public class StoreItem
{
    public string title { get; set; } = string.Empty;
    public string description { get; set; } = string.Empty;
    public int price { get; set; }
    public string imageUrl { get; set; } = string.Empty;
    public string type { get; set; } = "other";    // pdf|discount|giftcard|avatar|nickname|other
    public bool isActive { get; set; } = true;
    public string? avatarFrameUrl { get; set; }
    public bool? nicknameCustomizable { get; set; }
    public string? nicknameValue { get; set; }
    public string? pdfUrl { get; set; }
    public string? discountCode { get; set; }
    public string createdBy { get; set; } = string.Empty;
    public DateTime creationDate { get; set; } = DateTime.UtcNow;
}

public class CoinEntry
{
    public int amount { get; set; }
    public string source { get; set; } = string.Empty;
    public DateTime earnedDate { get; set; }
    public DateTime expiryDate { get; set; }
    public bool isSpent { get; set; }
}

public class StudentWallet
{
    public Dictionary<string, CoinEntry> Coins { get; set; } = new();
}

public class StoreTransaction
{
    public string studentId { get; set; } = string.Empty;
    public string studentName { get; set; } = string.Empty;
    public string itemId { get; set; } = string.Empty;
    public string itemTitle { get; set; } = string.Empty;
    public string itemType { get; set; } = string.Empty;
    public int coinsSpent { get; set; }
    public DateTime transactionDate { get; set; } = DateTime.UtcNow;
    public string status { get; set; } = "completed";
    public string? redeemedValue { get; set; }
    public string? chosenNickname { get; set; }
    public string? chosenNicknameColor { get; set; }
}

public class StudentReward
{
    public string? activeAvatarItemId { get; set; }
    public string? activeAvatarFrameUrl { get; set; }
    public string? nickname { get; set; }
    public string? nicknameColor { get; set; }
    public string? nicknameItemId { get; set; }
}
```

#### [MODIFY] [Subject.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Domain/Models/Subject.cs)

Add to `SubjectTeacher`:
```csharp
public Dictionary<string, StoreItem>? StoreItems { get; set; }
public Dictionary<string, StudentWallet>? StudentWallets { get; set; }
public Dictionary<string, StoreTransaction>? Transactions { get; set; }
public Dictionary<string, StudentReward>? StudentRewards { get; set; }
```

#### [MODIFY] [ModuleConfig.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Domain/Models/ModuleConfig.cs)

```csharp
public bool Store { get; set; } = true;
```

---

### Layer 2 — Core DTOs (`TheNurdz.Core`)

#### [NEW] `TheNurdz.Core/DTOs/StoreDTO.cs`

```csharp
// Store catalog item for student view
public class StoreItemDto
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public int Price { get; set; }
    public string ImageUrl { get; set; }
    public string Type { get; set; }
    public bool IsActive { get; set; }
    public string? AvatarFrameUrl { get; set; }
    public bool? NicknameCustomizable { get; set; }
    public string? NicknameValue { get; set; }
    public bool IsAffordable { get; set; }   // computed: AvailableBalance >= Price
}

// Student wallet summary
public class WalletDto
{
    public int AvailableBalance { get; set; }
    public int TotalEarned { get; set; }
    public int TotalSpent { get; set; }
    public int ExpiringWithin7Days { get; set; }
    public List<CoinEntryDto> Coins { get; set; } = [];
}

public class CoinEntryDto
{
    public int Amount { get; set; }
    public string Source { get; set; }
    public DateTime EarnedDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool IsSpent { get; set; }
    public bool IsExpired => !IsSpent && ExpiryDate < DateTime.UtcNow;
}

// Teacher transaction log entry
public class StoreTransactionDto
{
    public string Id { get; set; }
    public string StudentId { get; set; }
    public string StudentName { get; set; }
    public string ItemId { get; set; }
    public string ItemTitle { get; set; }
    public string ItemType { get; set; }
    public int CoinsSpent { get; set; }
    public DateTime TransactionDate { get; set; }
    public string Status { get; set; }
    public string? RedeemedValue { get; set; }
    public string? ChosenNickname { get; set; }
    public string? ChosenNicknameColor { get; set; }
}

// Active rewards for a student
public class StudentRewardDto
{
    public string? ActiveAvatarFrameUrl { get; set; }
    public string? Nickname { get; set; }
    public string? NicknameColor { get; set; }
}

// Teacher wallet summary per student
public class WalletSummaryDto
{
    public string StudentId { get; set; }
    public string StudentName { get; set; }
    public int AvailableBalance { get; set; }
    public int TotalEarned { get; set; }
    public int TotalSpent { get; set; }
    public int ExpiringWithin7Days { get; set; }
}

// Purchase input (studentId always resolved server-side)
public class PurchaseRequestDto
{
    public string ItemId { get; set; }
    public string SubjectId { get; set; }
    public string TeacherId { get; set; }
    public string GroupId { get; set; }
    // Nickname customization (only for nicknameCustomizable items)
    public string? ChosenNickname { get; set; }
    public string? ChosenNicknameColor { get; set; }
}

// Purchase result
public class PurchaseResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; }
    public int NewBalance { get; set; }
    public string? RedeemedValue { get; set; }   // PDF URL / discount code
}

// Teacher create/edit item
public class StoreItemCreateDto
{
    public string SubjectId { get; set; }
    public string TeacherId { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public int Price { get; set; }
    public string ImageUrl { get; set; }
    public string Type { get; set; }
    public bool IsActive { get; set; } = true;
    public string? AvatarFrameUrl { get; set; }
    public bool? NicknameCustomizable { get; set; }
    public string? NicknameValue { get; set; }
    public string? PdfUrl { get; set; }
    public string? DiscountCode { get; set; }
}
```

#### [MODIFY] [ScoringDTO.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Core/DTOs/ScoringDTO.cs)

```csharp
public string? AvatarFrameUrl { get; set; }
public string? Nickname { get; set; }
public string? NicknameColor { get; set; }
```

---

### Layer 3 — Core Services (`TheNurdz.Core`)

#### [NEW] `TheNurdz.Core/Interfaces/IStoreService.cs`

```csharp
public interface IStoreService
{
    Task<List<StoreItemDto>> GetActiveItemsAsync(string subjectId, string teacherId, int availableBalance);
    Task<WalletDto> GetWalletAsync(string subjectId, string teacherId, string studentId);
    Task<PurchaseResultDto> PurchaseItemAsync(PurchaseRequestDto request, string resolvedStudentId, string resolvedStudentName);
    Task CreditCoinsForScoreAsync(string subjectId, string teacherId, string studentId, int scorePoints, string source);
    Task<StudentRewardDto?> GetStudentRewardsAsync(string subjectId, string teacherId, string studentId);
    Task<List<StoreTransactionDto>> GetStudentTransactionsAsync(string subjectId, string teacherId, string studentId);
}
```

#### [NEW] `TheNurdz.Core/Services/StoreService.cs`

**`CreditCoinsForScoreAsync`** — called after every score save:
- Creates one `CoinEntry` with `amount = scorePoints`, `expiryDate = earnedDate + 60 days`, `isSpent = false`
- Uses `PostAsync` to get Firebase push-ID automatically
- If `scorePoints == 0`, skip (no coins for zero score)

**`GetWalletAsync`** — balance computation:
- Reads all `CoinEntry` records for the student
- Filters: `!isSpent && expiryDate > DateTime.UtcNow` → `AvailableBalance`
- Filters: `!isSpent && expiryDate > UtcNow && expiryDate <= UtcNow + 7 days` → `ExpiringWithin7Days`
- `TotalEarned` = sum of ALL entries regardless of expiry/spent
- `TotalSpent` = sum of `isSpent == true` entries

**`PurchaseItemAsync`** — full atomic-safe flow:
1. Read wallet (fresh, server-side)
2. If `balance < item.price` → return `{ Success: false, Message: "Insufficient coins" }`
3. Re-read `item.isActive` from DB → if `false` → return failure
4. **Deduct coins** (FIFO by expiryDate — earliest expiring first):
   - Sort valid coins by `expiryDate ASC`
   - Mark `isSpent = true` sequentially via `UpdateAsync` until `totalDeducted >= item.price`
5. Write `StoreTransaction` record
6. **Type-specific side effects**:
   - `avatar` → write `StudentRewards.activeAvatarFrameUrl` + `activeAvatarItemId`
   - `nickname` (not customizable) → write `StudentRewards.nickname = item.nicknameValue`
   - `nickname` (customizable) → write `StudentRewards.nickname = request.ChosenNickname`, `nicknameColor = request.ChosenNicknameColor`
7. Return `PurchaseResultDto` with `NewBalance` and `RedeemedValue` (PDF URL / discount code)

#### [MODIFY] [ServiceRegistration.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Core/ServiceRegistration.cs)

```csharp
services.AddScoped<IStoreService, StoreService>();
```

#### [MODIFY] [ScoreService.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Core/Services/ScoreService.cs)

Inject `IStoreService` and `ILogger`. After every score-save call, credit coins **non-blocking** (so score saving never fails due to coin issues):

```csharp
// After databaseProvider_Score.UpdateAsync(record, ...) succeeds:
_ = Task.Run(async () =>
{
    try
    {
        await _storeService.CreditCoinsForScoreAsync(subjectId, teacherId, studentId, record.score, $"{record.type}_{record.typeId}");
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Coin credit failed — student {StudentId}, score {Score}", studentId, record.score);
    }
});
```

This covers:
- `SaveQuizScoreAsync` — `source = "quiz_{quizId}"`
- Assignment score saves (in teacher app) — `source = "assignment_{assignmentId}"`
- Exam score saves — `source = "exam_{examId}"`

Also enrich `ScoringDTO` in `GetAllAsync` — batch-fetch `StudentRewards` for all students and map `AvatarFrameUrl`, `Nickname`, `NicknameColor`.

---

### Layer 4 — Teacher Core (`TheNurdz.Teacher.Core`)

#### [NEW] `TheNurdz.Teacher.Core/Interfaces/ITeacherStoreService.cs`

```csharp
public interface ITeacherStoreService
{
    Task<List<StoreItemDto>> GetAllItemsAsync(string subjectId, string teacherId);
    Task<string> AddItemAsync(StoreItemCreateDto dto);         // returns new itemId
    Task UpdateItemAsync(string subjectId, string teacherId, string itemId, StoreItemCreateDto dto);
    Task DeleteItemAsync(string subjectId, string teacherId, string itemId);
    Task ToggleItemActiveAsync(string subjectId, string teacherId, string itemId, bool isActive);
    Task<List<StoreTransactionDto>> GetTransactionsAsync(string subjectId, string teacherId);
    Task<List<WalletSummaryDto>> GetAllStudentWalletsAsync(string subjectId, string teacherId, IEnumerable<string> studentIds, IEnumerable<string> studentNames);
}
```

#### [NEW] `TheNurdz.Teacher.Core/Services/TeacherStoreService.cs`

- Full CRUD on `Subjects/{subjectId}/Teachers/{teacherId}/StoreItems/{itemId}/`
- Read-only on `Transactions/` (returns sorted by `transactionDate DESC`)
- `GetAllStudentWalletsAsync` — reads all `StudentWallets/` entries, computes live balances per student, merges with student name list

#### [MODIFY] `TheNurdz.Teacher.Core/ServiceRegistration.cs`

```csharp
services.AddScoped<ITeacherStoreService, TeacherStoreService>();
```

---

### Layer 5 — Student WebApp (`TheNurdz.WebApp`)

#### [NEW] `TheNurdz.WebApp/Controllers/StoreController.cs`

`[Authorize]` — all endpoints:

| Endpoint | Method | Notes |
|---|---|---|
| `/api/store/items` | GET | `?subjectId=&teacherId=` — returns items with `IsAffordable` set |
| `/api/store/wallet` | GET | `?subjectId=&teacherId=` — `studentId` from auth session |
| `/api/store/purchase` | POST | `PurchaseRequestDto` — `studentId` resolved from `User.Claims` |
| `/api/store/rewards` | GET | `?subjectId=&teacherId=` — returns active avatar + nickname |
| `/api/store/my-transactions` | GET | `?subjectId=&teacherId=` — student's own purchase history |

> [!CAUTION]
> `studentId` is **always** resolved from `User.FindFirst(ClaimTypes.NameIdentifier)` — NEVER from the request body. This is the primary anti-cheat guard.

#### [NEW] `TheNurdz.WebApp/Components/Pages/Store/Store.razor` + `Store.razor.cs`

**Route:** `/mycourses/{SubjectId}/store`

**Design — Dark Sci-Fi Competitive Theme:**

```
┌──────────────────────────────────────────────────────┐
│  ⚡ NURDZ COINS STORE          [🪙 142 coins]         │
├──────────────────────────────────────────────────────┤
│  ┌────────────────┐  ⚠️ 12 coins expiring in 3 days  │
│  │ Available: 142 │  Total Earned: 280 | Spent: 138  │
│  └────────────────┘                                  │
├──────────────────────────────────────────────────────┤
│  [Store] [My Purchases]          🏆 Top earners: ... │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │🎭 Avatar │ │📄 PDF    │ │🏷️ Nick   │             │
│  │          │ │          │ │          │             │
│  │ 50 🪙   │ │ 10 🪙   │ │ 25 🪙   │             │
│  │[Redeem✓]│ │[Redeem✓]│ │[Redeem✗]│  (dimmed)   │
│  └──────────┘ └──────────┘ └──────────┘             │
└──────────────────────────────────────────────────────┘
```

- Cards with `backdrop-filter: blur(16px)` glassmorphism
- Green neon glow border + "Redeem ✓" if affordable
- Dimmed grey + "Need X more coins" if not affordable
- **Nickname purchase dialog** (only for `nicknameCustomizable = true` items):
  - Text field: "Choose your nickname"
  - Color picker: 8 preset sci-fi colors (electric blue, neon green, solar gold, etc.)
  - Preview renders in chosen color
  - Submit = purchase + lock nickname
- **Coin expiry warning strip** (amber) if any valid coins expire within 7 days
- **Tab: My Purchases** — timeline view with item icon, date, coins spent, redeemed value reveal button
- **Competitive side panel** — top 3 coin earners in the group with avatar frames

#### [MODIFY] Student Nav / Layout + [App.razor](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.WebApp/Components/App.razor)

Add 🪙 **Store** nav icon to sidebar/topbar per-subject, with animated badge showing current coin balance. Navigates to `/mycourses/{SubjectId}/store`.

---

### Layer 6 — Teacher WebApp (`TheNurdz.Teacher.WebApp`)

#### [NEW] `TheNurdz.Teacher.WebApp/Components/Pages/Store/Store.razor` + `Store.razor.cs`

**Route:** `/store`

---

**Tab 1 — Store Items**

Item card grid (all items, active + inactive):
- Card: thumbnail image, type badge, price badge, active/inactive toggle chip
- Actions: Edit (opens dialog) | Delete (with confirm)
- FAB button: `+ Add Item`

---

**Tab 2 — Transactions Log**

Paginated sortable table:

| Date | Student | Item | Type | Coins Spent | Chosen Nickname | Status |
|---|---|---|---|---|---|---|

- Filter bar: by student name, item type, date range
- Export to CSV button
- Auto-refresh every 60 seconds
- Color-coded type badges: avatar = purple, nickname = blue, pdf = orange, giftcard = green, discount = amber

---

**Tab 3 — Student Wallets**

Leaderboard-style table:

| Rank | Student | Available | Earned | Spent | ⚠️ Expiring Soon |
|---|---|---|---|---|---|

- Progress bar: `spent / earned` ratio
- Amber indicator when `ExpiringWithin7Days > 0`

---

#### [NEW] `AddStoreItemDialog.razor` + `AddStoreItemDialog.razor.cs`

Conditional extra fields by type:

| Type selected | Extra fields shown |
|---|---|
| **PDF** | PDF upload → Firebase Storage → auto-fills `pdfUrl` |
| **Avatar** | Frame image upload → Firebase Storage → `avatarFrameUrl`. Preview of frame overlay. |
| **Nickname** | Toggle: "Teacher sets name" vs "Student customizes (name + color, one time)". If teacher-set: text input for `nicknameValue`. |
| **Discount / Gift Card** | Text input for `discountCode` / value |
| **Other** | Optional URL or value text |

Always present: Title, Description, Price (min 1), Card Image upload, Active toggle, Save / Cancel.

---

#### [MODIFY] Teacher Sidebar Navigation

Add **"Store & Redeems"** nav item with 🛒 icon, positioned after the Scores nav entry.

---

### Layer 7 — Scoreboard Enhancements (Both Apps)

#### [MODIFY] Student + Teacher Scoreboard UI

When `ScoringDTO.AvatarFrameUrl != null`:
- Wrap avatar image in `<div class="avatar-frame-wrapper">` with CSS `background-image: url(AvatarFrameUrl)` as the frame overlay
- Frame designs are sci-fi/academic SVG-based with CSS animations:
  - Holographic hexagon ring
  - Neural network pulse
  - Constellation orbit
  - DNA helix spin
  - Solar flare burst

When `ScoringDTO.Nickname != null`:
- Render nickname below student name in the chosen `NicknameColor`
- Font: bold italic, slightly smaller than name

---

### Layer 8 — Student Profile: Avatar & Nickname Display

#### [MODIFY] Student Profile Page

- Show the active avatar frame around profile picture (if redeemed)
- Show nickname in chosen color below name (if redeemed)
- If `NicknameCustomizable` item was purchased (one-time set at purchase), the nickname field is **read-only** in profile — to change it, the student must purchase another nickname slot

---

### Layer 9 — ModuleConfig Store Toggle

#### [MODIFY] [ModuleConfig.cs](file:///e:/WORK/FreeLance/ENG%20Baheeg/TheNurds/TheNurdz-Website/TheNurdz.Domain/Models/ModuleConfig.cs)

```csharp
public bool Store { get; set; } = true;
```

When `Store = false`:
- Store icon hidden from student nav
- `StoreController` endpoints return 403
- `CreditCoinsForScoreAsync` skips silently

---

## Security Model

| Threat | Mitigation |
|---|---|
| Student purchases for another student | `studentId` always from `User.Claims` server-side — never trusted from request body |
| Double-spend / race condition | Coins marked `isSpent` sequentially FIFO. Fresh DB read before each mark. Over-deduction impossible |
| Get redemption value without paying | `RedeemedValue` only returned inside `PurchaseResultDto` after confirmed successful deduction |
| Manual coin inflation by student | Coins ONLY created by `CreditCoinsForScoreAsync` called from score-save paths — no coin-add UI |
| Expired coins counted | Always filtered server-side: `expiryDate > DateTime.UtcNow` |
| Student writes to wallet via Firebase client | Firebase RTDB rules: `StudentWallets/**` → write = admin SDK only, read = owning UID only |
| Nickname change after one-time set | Nickname field is read-only in profile. Changing requires purchasing a new nickname item |

> [!CAUTION]
> **Firebase RTDB Security Rules must be updated before production:**
> - `StudentWallets/{studentId}/**` → read: owning UID, write: admin only
> - `Transactions/**` → read: teacher UID or owning student UID, write: admin only
> - `StudentRewards/{studentId}/**` → read: owning UID + teacher UID, write: admin only

---

## UI/UX Design Themes

### Student Store — Deep Space Sci-Fi
- Background: `#08091A` (deep space near-black)
- Accent: `#FFD700` electric gold (coins), `#00F5FF` cyan glow (avatar), `#A855F7` purple (nickname)
- Cards: glassmorphism `rgba(255,255,255,0.06)` with `backdrop-filter: blur(20px)` + `border: 1px solid rgba(255,255,255,0.12)`
- Affordable cards: neon gold `box-shadow: 0 0 20px rgba(255,215,0,0.4)` on hover
- Coin counter: animated flip-digit counter
- Purchase dialog: modal with backdrop blur, confirm animation, success confetti burst

### Avatar Frame Types (CSS-animated SVGs)
| Frame Name | Animation |
|---|---|
| Holographic Hexagon | Rotating gradient border |
| Neural Network | Pulsing node ring |
| Constellation | Orbiting dots |
| DNA Helix | Spinning double spiral |
| Solar Flare | Radiating glow pulses |

### Teacher Store Dashboard
- Pill-style tabs with animated slide indicator
- Transaction table: dark `#111827` rows with colored type badge chips
- Wallet leaderboard: neon rank numbers, gold for #1, silver for #2, bronze for #3

---

## Complete File Summary

| File | Status | Project |
|---|---|---|
| `TheNurdz.Domain/Models/Store.cs` | **NEW** | Domain |
| `TheNurdz.Domain/Models/Subject.cs` | MODIFY | Domain |
| `TheNurdz.Domain/Models/ModuleConfig.cs` | MODIFY | Domain |
| `TheNurdz.Core/DTOs/StoreDTO.cs` | **NEW** | Core |
| `TheNurdz.Core/DTOs/ScoringDTO.cs` | MODIFY | Core |
| `TheNurdz.Core/Interfaces/IStoreService.cs` | **NEW** | Core |
| `TheNurdz.Core/Services/StoreService.cs` | **NEW** | Core |
| `TheNurdz.Core/Services/ScoreService.cs` | MODIFY | Core |
| `TheNurdz.Core/ServiceRegistration.cs` | MODIFY | Core |
| `TheNurdz.Teacher.Core/Interfaces/ITeacherStoreService.cs` | **NEW** | Teacher.Core |
| `TheNurdz.Teacher.Core/Services/TeacherStoreService.cs` | **NEW** | Teacher.Core |
| `TheNurdz.Teacher.Core/ServiceRegistration.cs` | MODIFY | Teacher.Core |
| `TheNurdz.WebApp/Controllers/StoreController.cs` | **NEW** | Student WebApp |
| `TheNurdz.WebApp/Components/Pages/Store/Store.razor` | **NEW** | Student WebApp |
| `TheNurdz.WebApp/Components/Pages/Store/Store.razor.cs` | **NEW** | Student WebApp |
| `TheNurdz.WebApp/Components/Pages/Account/Profile.razor` | MODIFY | Student WebApp |
| `TheNurdz.WebApp/Components/App.razor` | MODIFY | Student WebApp |
| `TheNurdz.Teacher.WebApp/Components/Pages/Store/Store.razor` | **NEW** | Teacher WebApp |
| `TheNurdz.Teacher.WebApp/Components/Pages/Store/Store.razor.cs` | **NEW** | Teacher WebApp |
| `TheNurdz.Teacher.WebApp/Components/Pages/Store/AddStoreItemDialog.razor` | **NEW** | Teacher WebApp |
| `TheNurdz.Teacher.WebApp/Components/Pages/Store/AddStoreItemDialog.razor.cs` | **NEW** | Teacher WebApp |
| Teacher sidebar nav | MODIFY | Teacher WebApp |
| Student + Teacher scoreboards | MODIFY | Both WebApps |
| `TheNurdz.Tests` (4 new test methods) | **NEW** | Tests |

---

## Verification Plan

### Automated Tests (`TheNurdz.Tests`)

```
StoreServiceTests:
  ✓ GetWalletAsync_ExcludesExpiredCoins
  ✓ GetWalletAsync_ExcludesSpentCoins
  ✓ PurchaseItemAsync_InsufficientBalance_ReturnsFail
  ✓ PurchaseItemAsync_SufficientBalance_DeductsEarliestExpiring
  ✓ PurchaseItemAsync_InactiveItem_ReturnsFail
  ✓ CreditCoinsForScoreAsync_ZeroScore_SkipsEntry
  ✓ CreditCoinsForScoreAsync_PositiveScore_SetsCorrectExpiry
```

### Manual UAT Flow

1. **Teacher**: Open Store & Redeems → add Avatar (50 coins), PDF (10 coins), Nickname-customizable (25 coins).
2. **Student**: Open Store → balance = 0, all cards dimmed with "Need X more coins".
3. **Teacher**: Give student quiz score of 60 → student refreshes → balance = 60 coins. PDF card glows green.
4. **Student**: Redeem PDF (10 coins) → dialog shows balance: 60 → 50 → confirm → success. PDF link appears in My Purchases.
5. **Teacher**: Transactions log shows the purchase with date, student, item, 10 coins spent.
6. **Student**: Redeem Nickname item (25 coins) → dialog appears: "Enter nickname" + color picker → student types "NovaStar" + picks cyan → confirm → balance: 50 → 25. Nickname appears in profile and scoreboard in cyan.
7. **Student**: Profile shows nickname field as read-only (one-time set).
8. **Student**: Redeem Avatar (50 coins) → error: "Insufficient coins (25 available)". No transaction written.
9. **Teacher**: Give student exam score of 40 → balance = 65. Avatar now affordable.
10. **Student**: Redeem Avatar → balance: 65 → 15. Avatar frame appears on profile picture and in scoreboard.
11. **Teacher**: Scoreboard shows student with avatar frame + "NovaStar" in cyan under their name.
12. **DB Test**: Manually set a coin entry's `expiryDate` to yesterday → balance drops accordingly. Expired coin shows greyed in coin history.
13. **Security Test**: POST to `/api/store/purchase` with spoofed `studentId` in body → server ignores body `studentId`, uses session UID.
