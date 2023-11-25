const express = require("express");
const app = express();
app.use(express.json());

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const toDate = require("date-fns/toDate");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDBAndResponse = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndResponse();

const checkRequestQueries = async (request, response, next) => {
  const { search_q, category, priority, status, date } = request.query;
  const { todoId } = request.params;
  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    const categoryIsInArray = categoryArray.includes(category);
    if (categoryIsInArray === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  }
  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    const statusIsInArray = statusArray.includes(status);
    if (statusIsInArray === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }
  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    const priorityIsInArray = priorityArray.includes(priority);
    if (priorityIsInArray === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }
  if (date !== undefined) {
    try {
      const myDate = new Date(date);
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      console.log(formattedDate, "f");
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
        )
      );
      console.log(result, "r");
      console.log(new Date(), "new");
      const isValidDate = await isValid(result);
      console.log(isValidDate, "V");
      if (isValidDate === true) {
        request.date = formattedDate;
      } else {
        response.status(400);
        response.send("Invalid Todo Date");
      }
    } catch {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
  request.todoId = todoId;
  request.search_q = search_q;
  next();
};

const checkRequestBody = (request, response, next) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  const { todoId } = request.params;
  if (category !== undefined) {
    categoryArray = ["WORK", "HOME", "LEARNING"];
    categoryIsInArray = categoryArray.includes(category);
    if (categoryIsInArray === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  if (priority !== undefined) {
    priorityArray = ["HIGH", "MEDIUM", "LOW"];
    priorityIsInArray = priorityArray.includes(priority);
    if (priorityIsInArray === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }
  if (status !== undefined) {
    statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    statusIsInArray = statusArray.includes(status);
    if (statusIsInArray === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      console.log(formattedDate);
      const result = toDate(new Date(formattedDate));
      const isValidDate = isValid(result);
      console.log(isValidDate);
      if (isValidDate === true) {
        request.dueDate = formattedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.todo = todo;
  request.id = id;
  request.todoId = todoId;
  next();
};

//API-1

app.get("/todos/", checkRequestQueries, async (request, response) => {
  const { status = "", search_q = "", priority = "", category = "" } = request;
  const getTodosQuery = `
    SELECT 
        id,todo,priority,status,category,due_date AS dueDate
    FROM todo
    WHERE 
    todo LIKE '%${search_q}%' AND status LIKE '%${status}%'
    AND category LIKE '%${category}%' AND priority LIKE '%${priority}%'`;
  const todoArray = await db.all(getTodosQuery);
  response.send(todoArray);
});

//api-2 specific TODO

app.get("/todos/:todoId/", checkRequestQueries, async (request, response) => {
  const { todoId } = request;
  const getTodoQ = `
    SELECT id,todo,priority,status,category,due_date AS dueDate
    FROM todo
    WHERE id = ${todoId}`;
  const todo = await db.get(getTodoQ);
  response.send(todo);
});

//api-3 specific due date in the query parameter /agenda/?date=2021-12-12
app.get("/agenda/", checkRequestQueries, async (request, response) => {
  const { date } = request;
  console.log(date, "a");
  const getTodoAgenda = `
    SELECT id,todo,priority,status,category,due_date AS dueDate
    FROM todo
    WHERE due_date = '${date}';`;
  const agendaArray = await db.all(getTodoAgenda);
  if (agendaArray === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(agendaArray);
  }
});

//api -4 :- create todo
app.post("/todos/", checkRequestBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;
  const createTodo = `
    INSERT INTO 
        todo (id,todo,priority,status,category,due_date)
    VALUES 
        (${id},'${todo}','${priority}','${status}','${dueDate}')`;
  await db.run(createTodo);
  response.send("Todo Successfully Added");
});

//api 5 :- update

app.put("/todos/:todoId/", checkRequestBody, async (request, response) => {
  const { todoId } = request;
  const { priority, todo, status, dueDate, category } = request;
  let updateTodoQuery = null;
  switch (true) {
    case status !== undefined:
      updateTodoQuery = `
            UPDATE 
                todo
            SET 
                status = '${status}'
            WHERE 
                id = ${todoID}`;
      await db.run(updateTodoQuery);
      response.send("Status Updated");
      break;
    case priority !== undefined:
      updateTodoQuery = `
            UPDATE 
                todo
            SET 
                priority = '${priority}'
            WHERE 
                id = ${todoID}`;
      await db.run(updateTodoQuery);
      response.send("Priority Updated");
      break;
    case category !== undefined:
      updateTodoQuery = `
            UPDATE 
                todo
            SET 
                category = '${category}'
            WHERE 
                id = ${todoID}`;
      await db.run(updateTodoQuery);
      response.send("Category Updated");
      break;
    case todo !== undefined:
      updateTodoQuery = `
            UPDATE 
                todo
            SET 
                todo = '${todo}'
            WHERE 
                id = ${todoID}`;
      await db.run(updateTodoQuery);
      response.send("Todo Updated");
      break;
    case dueDate !== undefined:
      updateTodoQuery = `
            UPDATE 
                todo
            SET 
                due_date = '${dueDate}'
            WHERE 
                id = ${todoID}`;
      await db.run(updateTodoQuery);
      response.send("Due Date Updated");
      break;
  }
});

//api 6 : delete

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodo = `
    DELETE FROM todo
    WHERE id = ${todoId}`;
  await db.run(deleteTodo);
  response.send("Todo Deleted");
});

module.exports = app;
