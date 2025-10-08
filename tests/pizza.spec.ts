import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { Role, User } from "../src/service/pizzaService";

//Full functioning tests
test("home page", async ({ page }) => {
    await page.goto("/");

    expect(await page.title()).toBe("JWT Pizza");
});

async function basicInit(page: Page) {
    let loggedInUser: User | undefined;
    let registeredUser: User | undefined;
    const validUsers: Record<string, User> = {
        "d@jwt.com": {
            id: "3",
            name: "Kai Chen",
            email: "d@jwt.com",
            password: "a",
            roles: [{ role: Role.Diner }],
        },
        "b@jwt.com": {
            id: "3",
            name: "Braden Bledsoe",
            email: "b@jwt.com",
            password: "b",
            roles: [{ role: Role.Diner }],
        },
        "f@jwt.com": {
            id: "3",
            name: "Frank owner",
            email: "f@jwt.com",
            password: "franchisee",
            roles: [
                { role: Role.Diner },
                { objectId: "2", role: Role.Franchisee },
            ],
        },
        "a@jwt.com": {
            id: "3",
            name: "Juan",
            email: "a@jwt.com",
            password: "admin",
            roles: [{ role: Role.Admin }],
        },
    };

    // Authorize login or registration for the given user
    await page.route("*/**/api/auth", async (route) => {
        const loginReq = route.request().postDataJSON();

        if (route.request().method() === "POST") {
            // Simulate a successful registration response
            const newUser: User = {
                id: "99",
                name: loginReq.name,
                email: loginReq.email,
                roles: [{ role: Role.Diner }],
            };

            registeredUser = validUsers[loginReq.email];
            const registerRes = {
                user: registeredUser,
                token: "abcdef",
            };

            expect(route.request().method()).toBe("POST");
            await route.fulfill({ json: registerRes });
            return;
        } else if (route.request().method() === "PUT") {
            const user = validUsers[loginReq.email];
            if (!user || user.password !== loginReq.password) {
                await route.fulfill({
                    status: 401,
                    json: { error: "Unauthorized" },
                });
                return;
            }
            loggedInUser = validUsers[loginReq.email];
            const loginRes = {
                user: loggedInUser,
                token: "abcdef",
            };
            expect(route.request().method()).toBe("PUT");
            await route.fulfill({ json: loginRes });
        } else if (route.request().method() === "DELETE") {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ message: "logout successful" }),
            });
        }
    });

    // Return the currently logged in user
    await page.route("*/**/api/user/me", async (route) => {
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: loggedInUser });
    });

    // A standard menu
    await page.route("*/**/api/order/menu", async (route) => {
        const menuRes = [
            {
                id: 1,
                title: "Veggie",
                image: "pizza1.png",
                price: 0.0038,
                description: "A garden of delight",
            },
            {
                id: 2,
                title: "Pepperoni",
                image: "pizza2.png",
                price: 0.0042,
                description: "Spicy treat",
            },
        ];
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: menuRes });
    });

    // Standard franchises and stores
    await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
        const franchiseRes = {
            franchises: [
                {
                    admins: [loggedInUser],
                    id: 2,
                    name: "LotaPizza",
                    stores: [
                        { id: 4, name: "Lehi" },
                        { id: 5, name: "Springville" },
                        { id: 6, name: "American Fork" },
                    ],
                },
                {
                    id: 3,
                    name: "PizzaCorp",
                    stores: [{ id: 7, name: "Spanish Fork" }],
                },
                { id: 4, name: "topSpot", stores: [] },
            ],
        };
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: franchiseRes });
    });

    // Mock for fetching a specific franchise (like /api/franchise/3)
    await page.route(/\/api\/franchise\/\d+$/, async (route) => {
        console.log("Intercepted specific franchise:", route.request().url());

        const singleFranchiseRes = [
            {
                id: 2,
                name: "pizzaPocket",
                admins: [
                    {
                        id: 3,
                        name: "Frank owner",
                        email: "f@jwt.com",
                    },
                ],
                stores: [{ id: 1, name: "SLC", totalRevenue: 0.032 }],
            },
        ];

        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: singleFranchiseRes });
    });

    // Order a pizza.
    await page.route("*/**/api/order", async (route) => {
        if (route.request().method() === "POST") {
            const orderReq = route.request().postDataJSON();
            const orderRes = {
                order: { ...orderReq, id: 23 },
                jwt: "eyJpYXQ",
            };
            expect(route.request().method()).toBe("POST");
            await route.fulfill({ json: orderRes });
        } else if (route.request().method() === "GET") {
            expect(route.request().method()).toBe("GET");
            await route.fulfill({ json: [] });
        }
    });

    await page.goto("/");
}

test("login", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("d@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByRole("link", { name: "KC" })).toBeVisible();
});

test("purchase with login", async ({ page }) => {
    await basicInit(page);

    // Go to order page
    await page.getByRole("button", { name: "Order now" }).click();

    // Create order
    await expect(page.locator("h2")).toContainText("Awesome is a click away");
    await page.getByRole("combobox").selectOption("4");
    await page
        .getByRole("link", { name: "Image Description Veggie A" })
        .click();
    await page
        .getByRole("link", { name: "Image Description Pepperoni" })
        .click();
    await expect(page.locator("form")).toContainText("Selected pizzas: 2");
    await page.getByRole("button", { name: "Checkout" }).click();

    // Login
    await page.getByPlaceholder("Email address").click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    // Pay
    await expect(page.getByRole("main")).toContainText(
        "Send me those 2 pizzas right now!"
    );
    await expect(page.locator("tbody")).toContainText("Veggie");
    await expect(page.locator("tbody")).toContainText("Pepperoni");
    await expect(page.locator("tfoot")).toContainText("0.008 ₿");
    await page.getByRole("button", { name: "Pay now" }).click();
    await expect(page.getByRole("heading")).toContainText(
        "Here is your JWT Pizza!"
    );
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(
        page.getByRole("heading", { name: "JWT Pizza - invalid" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    // Check balance
    await expect(page.getByText("0.008")).toBeVisible();
});

test("register", async ({ page }) => {
    await basicInit(page);

    await page.getByRole("link", { name: "Register" }).click();
    await page
        .getByRole("textbox", { name: "Full name" })
        .fill("Braden Bledsoe");
    await page.getByRole("textbox", { name: "Full name" }).press("Tab");
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("b@jwt.com");
    await page.getByRole("textbox", { name: "Email address" }).press("Tab");
    await page.getByRole("textbox", { name: "Password" }).fill("b");
    await page.getByRole("button", { name: "Register" }).click();
});

test("franchise page and functionality, looking into diner dashboard", async ({
    page,
}) => {
    await basicInit(page);

    await page
        .getByLabel("Global")
        .getByRole("link", { name: "Franchise" })
        .click();
    await expect(page.getByRole("alert")).toContainText(
        "If you are already a franchisee, pleaseloginusing your franchise account"
    );
    await page.getByRole("link", { name: "home" }).click();
    await page
        .getByLabel("Global")
        .getByRole("link", { name: "Franchise" })
        .click();
    await page.getByRole("link", { name: "home" }).click();
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("f@jwt.com");
    await page.getByRole("textbox", { name: "Email address" }).press("Tab");
    await page.getByRole("textbox", { name: "Password" }).fill("franchisee");
    await page.getByRole("button", { name: "Login" }).click();
    await page
        .getByLabel("Global")
        .getByRole("link", { name: "Franchise" })
        .click();
    await expect(page.getByRole("main")).toContainText(
        "Everything you need to run an JWT Pizza franchise. Your gateway to success."
    );
    await page.getByRole("link", { name: "fo" }).click();
    await expect(page.getByRole("main")).toContainText(", Franchisee on 2");
});

test("logout", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("f@jwt.com");
    await page.getByRole("textbox", { name: "Email address" }).press("Tab");
    await page.getByRole("textbox", { name: "Password" }).fill("franchisee");
    await page.getByRole("button", { name: "Login" }).click();
    await page.getByRole("link", { name: "Logout" }).click();
    await expect(page.locator("#navbar-dark")).toContainText("Login");
});

test("diner dashboard", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("f@jwt.com");
    await page.getByRole("textbox", { name: "Email address" }).press("Tab");
    await page.getByRole("textbox", { name: "Password" }).fill("franchisee");
    await page.getByRole("button", { name: "Login" }).click();
    await page.getByRole("link", { name: "Logout" }).click();
    await expect(page.locator("#navbar-dark")).toContainText("Login");
});

test("admin page", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("a@jwt.com");
    await page.getByRole("textbox", { name: "Email address" }).press("Tab");
    await page.getByRole("textbox", { name: "Password" }).fill("admin");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.locator("#navbar-dark")).toContainText("Admin");
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.locator("h3")).toContainText("Franchises");
    await page
        .getByRole("row", { name: "Spanish Fork ₿ Close" })
        .getByRole("button")
        .click();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await page
        .getByRole("row", { name: "pizzaCorp" })
        .getByRole("button")
        .click();
    await expect(page.getByText("Sorry to see you go")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
        page.getByRole("button", { name: "Add Franchise" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Add Franchise" }).click();
    await page.getByRole("textbox", { name: "franchise name" }).click();
    await page
        .getByRole("textbox", { name: "franchise name" })
        .fill("Brand New Franchise");
});

test("about", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "About" }).click();
    await expect(page.getByRole("main")).toContainText("The secret sauce");
});
