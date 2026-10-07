const { marked } = require('marked');

const title = process.env.ISSUE_TITLE;
const body = process.env.ISSUE_BODY || '';
const issueUrl = process.env.ISSUE_URL;

const html =
    marked.parse(body) +
    `<hr>
    <p><strong>GitHub Issue:</strong>
    <a href="${issueUrl}">${issueUrl}</a></p>`;

async function createPage() {
    try {
        const response = await fetch(
            `${process.env.BOOKSTACK_URL}/api/pages`,
            {
                method: 'POST',
                headers: {
                    'Authorization':
                        `Token ${process.env.BOOKSTACK_TOKEN_ID}:${process.env.BOOKSTACK_TOKEN_SECRET}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    book_id: 1,
                    name: title,
                    html: html
                })
            }
        );

        const text = await response.text();

        if (!response.ok) {
            throw new Error(
                `BookStack API error ${response.status}: ${text}`
            );
        }

        console.log('BookStack page created successfully');
        console.log(text);

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

createPage();
