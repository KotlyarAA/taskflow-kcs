const { marked } = require('marked');

// Данные GitHub Issue из переменных окружения
const title = process.env.ISSUE_TITLE;
const body = process.env.ISSUE_BODY || '';
const issueUrl = process.env.ISSUE_URL;
const issueNumber = process.env.ISSUE_NUMBER;
const action = process.env.ISSUE_ACTION;

// Название страницы содержит номер Issue,
// чтобы страницу можно было найти при edited и closed
const pageName = `[Issue #${issueNumber}] ${title}`;

// Определяем статус Issue
let status = 'Открыто';

if (action === 'closed') {
    status = 'Закрыто';
}

// Преобразуем Markdown из GitHub Issue в HTML
const html =
    `<p><strong>Статус Issue:</strong> ${status}</p>` +
    marked.parse(body) +
    `<hr>
    <p>
        <strong>GitHub Issue:</strong>
        <a href="${issueUrl}">${issueUrl}</a>
    </p>`;

// Заголовки для BookStack API
const headers = {
    'Authorization':
        `Token ${process.env.BOOKSTACK_TOKEN_ID}:${process.env.BOOKSTACK_TOKEN_SECRET}`,
    'Content-Type': 'application/json'
};

// Универсальная функция обращения к BookStack API
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

// Создание новой страницы
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

    console.log(
        `BookStack page created successfully. ID: ${result.id}`
    );
}

// Поиск существующей страницы по номеру GitHub Issue
async function findPage() {
    const result = await request(
        `${process.env.BOOKSTACK_URL}/api/pages?count=500`
    );

    if (!result.data) {
        return null;
    }

    return result.data.find(
        page => page.name.startsWith(`[Issue #${issueNumber}]`)
    );
}

// Обновление существующей страницы
async function updatePage() {
    const page = await findPage();

    // Если страница не была создана ранее,
    // автоматически создаём её
    if (!page) {
        console.log(
            `BookStack page for Issue #${issueNumber} was not found. Creating it...`
        );

        await createPage();
        return;
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

    console.log(
        `BookStack page updated successfully. ID: ${page.id}`
    );
}

// Основная функция синхронизации
async function sync() {
    try {
        console.log(
            `Synchronizing Issue #${issueNumber}. Action: ${action}`
        );

        if (action === 'opened') {
            await createPage();
        } else if (
            action === 'edited' ||
            action === 'closed'
        ) {
            await updatePage();
        } else {
            console.log(
                `Action "${action}" does not require synchronization.`
            );
            return;
        }

        console.log(
            `Issue #${issueNumber} synchronized successfully.`
        );

    } catch (error) {
        console.error('Synchronization failed:');
        console.error(error);
        process.exit(1);
    }
}

sync();
