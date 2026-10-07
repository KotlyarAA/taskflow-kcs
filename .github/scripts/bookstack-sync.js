const { marked } = require('marked');

const title = process.env.ISSUE_TITLE;
const body = process.env.ISSUE_BODY || '';
const issueUrl = process.env.ISSUE_URL;
const issueNumber = process.env.ISSUE_NUMBER;
const action = process.env.ISSUE_ACTION;

const pageName = `[Issue #${issueNumber}] ${title}`;

let status = 'Открыто';

if (action === 'closed') {
    status = 'Закрыто';
}

const html =
    `<p><strong>Статус Issue:</strong> ${status}</p>` +
    marked.parse(body) +
    `<hr>
    <p><strong>GitHub Issue:</strong>
    <a href="${issueUrl}">${issueUrl}</a></p>`;

const headers = {
    'Authorization':
        `Token ${process.env.BOOKSTACK_TOKEN_ID}:${process.env.BOOKSTACK_TOKEN_SECRET}`,
    'Content-Type': 'application/json'
};

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...(options.headers || {})
        }
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `BookStack API error ${response.status}: ${text}`
        );
    }

    return text ? JSON.parse(text) : {};
}

async function createPage() {
    const result = await request(
        `${process.env.BOOKSTACK_URL}/api/pages`,
        {
            method: 'POST',
            body: JSON.stringify({
                book_id: 1,
                name: pageName,
                html: html
            })
        }
    );

    console.log(`BookStack page created. ID: ${result.id}`);
}

async function findPage() {
    const result = await request(
        `${process.env.BOOKSTACK_URL}/api/pages?count=500`
    );

    return result.data.find(
        page => page.name.startsWith(`[Issue #${issueNumber}]`)
    );
}

async function updatePage() {
    const page = await findPage();

    if (!page) {
        throw new Error(
            `BookStack page for Issue #${issueNumber} was not found`
        );
    }

    await request(
        `${process.env.BOOKSTACK_URL}/api/pages/${page.id}`,
        {
            method: 'PUT',
            body: JSON.stringify({
                book_id: 1,
                name: pageName,
                html: html
            })
        }
    );

    console.log(`BookStack page updated. ID: ${page.id}`);
}

async function sync() {
    try {
        if (action === 'opened') {
            await createPage();
        } else if (action === 'edited' || action === 'closed') {
            await updatePage();
        }

        console.log(`Issue action "${action}" synchronized successfully`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

sync();
