import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { Role, User } from "../src/service/pizzaService";

async function basicInit(page: Page) {
    let loggedInUser: User | undefined;
    let registeredUser: User | undefined;
    const validUsers: Record<string, User> = {
        "p@jwt.com": {
            id: "3",
            name: "pizza diner",
            email: "p@jwt.com",
            password: "diner",
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

    await page.route(/\/api\/user(\?.*)?$/, async (route) => {
        const userRes = {
            users: [
                {
                    id: 3,
                    name: "pizza diner",
                    email: "p@jwt.com",
                    password: "diner",
                    roles: [{ role: Role.Diner }],
                },
                {
                    id: 1,
                    name: "Frank owner",
                    email: "f@jwt.com",
                    password: "franchisee",
                    roles: [
                        { role: Role.Diner },
                        { objectId: "2", role: Role.Franchisee },
                    ],
                },
                {
                    id: 5,
                    name: "Juan",
                    email: "a@jwt.com",
                    password: "admin",
                    roles: [{ role: Role.Admin }],
                },
            ],
        };
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: userRes });
    });

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

    // Order a pizza.
    await page.route("*/**/api/order", async (route) => {
        if (route.request().method() === "POST") {
            const orderReq = route.request().postDataJSON();
            const orderRes = {
                dinerId: loggedInUser?.id,
                orders: [],
                page: 1,
            };
            expect(route.request().method()).toBe("POST");
            await route.fulfill({ json: orderRes });
        } else if (route.request().method() === "GET") {
            expect(route.request().method()).toBe("GET");
            await route.fulfill({ json: [] });
        }
    });

    await page.route("*/**/api/user/*", async (route) => {
        const method = route.request().method();
        if (method === "PUT") {
            const userReq = route.request().postDataJSON();

            // Find the user in validUsers by matching ID
            const userEntry = Object.entries(validUsers).find(
                ([, user]) => user.id === userReq.id
            );

            if (userEntry) {
                const [oldEmail, existingUser] = userEntry;

                const newEmail = userReq.email ?? existingUser.email;

                const updatedUser: User = {
                    ...existingUser,
                    name: userReq.name ?? existingUser.name,
                    email: newEmail,
                    password: userReq.password ?? existingUser.password,
                    roles: userReq.roles ?? existingUser.roles,
                };

                // If the email changed, move the entry to a new key
                if (newEmail !== oldEmail) {
                    delete validUsers[oldEmail];
                    validUsers[newEmail] = updatedUser;
                } else {
                    validUsers[oldEmail] = updatedUser;
                }

                // Update loggedInUser if it matches
                if (loggedInUser?.id === userReq.id) {
                    loggedInUser = updatedUser;
                }

                await route.fulfill({
                    json: {
                        user: updatedUser,
                        token: "abcdef",
                    },
                });
            } else {
                await route.fulfill({
                    status: 404,
                    json: { error: "User not found" },
                });
            }
        } else if (method === "DELETE") {
            const userId = route.request().url().split("/").pop();
            const entry = Object.entries(validUsers).find(
                ([, user]) => user.id === userId
            );

            if (entry) {
                const [email] = entry;
                delete validUsers[email];
                // If the deleted user was logged in, log them out
                if (loggedInUser?.id === userId) {
                    loggedInUser = undefined;
                }
                await route.fulfill({
                    status: 200,
                    json: { message: "User deleted successfully" },
                });
            } else {
                await route.fulfill({
                    status: 404,
                    json: { error: "User not found" },
                });
            }
        }
    });

    // Return the currently logged in user
    await page.route("*/**/api/user/me", async (route) => {
        expect(route.request().method()).toBe("GET");
        const currentUser = loggedInUser?.email
            ? validUsers[loggedInUser.email]
            : undefined;

        await route.fulfill({ json: currentUser });
    });

    await page.goto("/");
}

test("updateUser testing user name and basic functionality", async ({
    page,
}) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Register" }).click();
    await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("p@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Register" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("pizza diner");

    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h3")).toContainText("Edit user");
    await page.getByRole("button", { name: "Update" }).click();

    await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

    await expect(page.getByRole("main")).toContainText("pizza diner");

    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h3")).toContainText("Edit user");
    await page.getByRole("textbox").first().fill("pizza dinerx");
    await page.getByRole("button", { name: "Update" }).click();

    await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

    await expect(page.getByRole("main")).toContainText("pizza dinerx");
    await page.getByRole("link", { name: "Logout" }).click();
    await page.getByRole("link", { name: "Login" }).click();

    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("p@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("pizza dinerx");

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator('input[type="email"]').fill("d@jwt.com");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByRole("main")).toContainText("d@jwt.com");

    await page.getByRole("link", { name: "Logout" }).click();
    await page.getByRole("link", { name: "Login" }).click();

    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("d@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("d@jwt.com");
});

test("updateUser testing email change", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("p@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("p@jwt.com");

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator('input[type="email"]').fill("d@jwt.com");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByRole("main")).toContainText("d@jwt.com");

    await page.getByRole("link", { name: "Logout" }).click();
    await page.getByRole("link", { name: "Login" }).click();

    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("d@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("d@jwt.com");
});

test("updateUser testing password change", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("p@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("p@jwt.com");

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("#password").click();
    await page.locator("#password").fill("bro");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByRole("main")).toContainText("p@jwt.com");

    await page.getByRole("link", { name: "Logout" }).click();
    await page.getByRole("link", { name: "Login" }).click();

    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("p@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("bro");
    await page.getByRole("button", { name: "Login" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("p@jwt.com");
});

test("list users components", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("a@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("admin");
    await page.getByRole("button", { name: "Login" }).click();
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.getByRole("main")).toContainText("Users");
    await expect(page.getByRole("main")).toContainText("Name");
    await expect(page.getByRole("main")).toContainText("Email");
    await expect(page.getByRole("main")).toContainText("Role");
    await expect(
        page.getByRole("textbox", { name: "Filter users" })
    ).toBeVisible();

    await expect(
        page.getByRole("textbox", { name: "Filter users" })
    ).toBeVisible();
    await expect(page.locator("#userMorePage")).toBeVisible();
    await page.getByRole("textbox", { name: "Filter users" }).click();
    await page.getByRole("textbox", { name: "Filter users" }).fill("p@jwt.com");
    await page.getByRole("button", { name: "Submit" }).first().click();
    await expect(page.getByRole("main")).toContainText("p@jwt.com");
});

test("delete user", async ({ page }) => {
    await basicInit(page);
    await page.getByRole("link", { name: "Login" }).click();
    await page
        .getByRole("textbox", { name: "Email address" })
        .fill("a@jwt.com");
    await page.getByRole("textbox", { name: "Password" }).fill("admin");
    await page.getByRole("button", { name: "Login" }).click();
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.getByRole("cell", { name: "p@jwt.com" })).toBeVisible();
    await expect(
        page
            .getByRole("row", { name: "pizza diner p@jwt.com diner" })
            .getByRole("button")
    ).toBeVisible();
    await page
        .getByRole("row", { name: "pizza diner p@jwt.com" })
        .getByRole("button")
        .click();
});
