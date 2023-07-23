const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
const isValid = require("date-fns/isValid");
const app = express();
app.use(express.json());

let db;
const initializeDBandServer = async ()=>{
    try{
        db = await open({
            filename: path.join(__dirname, "todoApplication.db"),
            driver: sqlite3.Database,
        });
        app.listen(3000, ()=>{
            console.log("Server is running on http://localhost:3000/");
        });
    }catch(error){
        console.log(`DataBase error is ${error.message}`);
        process.exit(1);
    }
};

initializeDBandServer()

const hasPriorityAndStatusProperties = (requestQuery) => {
    return(
        requestQuery.priority !== undefined && requestQuery.status !== undefined
    );
}

const hasPriorityProperty = (requestQuery) =>{
    return (
        requestQuery.priority !== undefined;
    )
}

const hasStatusProperty = (requestQuery) =>{
    return(
        requestQuery.status !== undefined;
    )
}

const hasCategoryAndPriority = (requestQuery)=>{
    return(
        requestQuery.category !== undefined && requestQuery.priority !== undefined;
    );
}

const hasCategoryAndStatus = (requestQuery)=>{
    return(
        requestQuery.category !== undefined && requestQuery.status !== undefined;
    );
}

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasSearchProperty = (requestQuery) => {
    return(
        requestQuery.search_q !== undefined;
    )
}

const output = (dbObject) =>{
    return{
        id:dbObject.id,
        todo: dbObject.todo,
        priority:dbObject.priority,
        status:dbObject.status,
        category:dbObject.category,
        dueDate:dbObject.due_date,
    }
}

//API 1

app.get("/todos/", async(request, response) {
    let data = null;
    let getTodosQuery = "";
    const {search_q="", priority, status, category} = request.query

    switch(true){
        case hasPriorityAndStatusProperties(request.query):
            if(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW"){
                if(status === "TO DO" || status === "IN PROGRESS" || status === "DONW"){
                    getTodosQuery =`
                    SELECT * FROM todo WHERE status ='${status}' and priority= '${priority}';`;
                    data = await db.all(getTodosQuery)
                    response.send(data.map((eachItem) => output(eachItem)));
                }else{
                    response.status(400);
                    response.send("Invalid Todo Status");

                }
            }else{
                    response.status(400);
                    response.send("Invalid Todo Priority");

                }
            break;
        
        case hasCategoryAndStatus(request.query):
            if (
                category === "WORK" ||
                category === "HOME" ||
                category === "LEARNING"
            ) {
                if (
                status === "TO DO" ||
                status === "IN PROGRESS" ||
                status === "DONE"
                ) {
                getTodosQuery = `select * from todo where category='${category}' and status='${status}';`;
                data = await db.all(getTodosQuery);
                response.send(data.map((eachItem) => output(eachItem)));
                } else {
                response.status(400);
                response.send("Invalid Todo Status");
                }
            } else {
                response.status(400);
                response.send("Invalid Todo Category");
            }

            break;

        case hasCategoryAndPriority(request.query):
            if (
                category === "WORK" ||
                category === "HOME" ||
                category === "LEARNING"
            ) {
                if (
                priority === "HIGH" ||
                priority === "MEDIUM" ||
                priority === "LOW"
                ) {
                getTodosQuery = `select * from todo where category='${category}' and priority='${priority}';`;
                data = await db.all(getTodosQuery);
                response.send(data.map((eachItem) => output(eachItem)));
                } else {
                response.status(400);
                response.send("Invalid Todo Priority");
                }
            } else {
                response.status(400);
                response.send("Invalid Todo Category");
            }

            break;

        case hasPriorityProperty(request.query):
            if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
                getTodosQuery = `
            SELECT * FROM todo WHERE priority = '${priority}';`;
                data = await db.all(getTodosQuery);
                response.send(data.map((eachItem) => output(eachItem)));
            } else {
                response.status(400);
                response.send("Invalid Todo Priority");
            }
            break;
        
        case hasStatusProperty(request.query):
            if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
                getTodosQuery = `SELECT * FROM todo WHERE status = '${status}';`;
                data = await db.all(getTodosQuery);
                response.send(data.map((eachItem) => output(eachItem)));
            } else {
                response.status(400);
                response.send("Invalid Todo Status");
            }
            break;
        
        case hasSearchProperty(request.query):
            getTodosQuery = `SELECT* FROM todo WHERE todo like '%${search_q}%';`;
            data = await db.all(getTodosQuery);
            response.send(data.map((eachItem) => output(eachItem)));
            break;

        case hasCategoryProperty(request.query):
            if (
                category === "WORK" ||
                category === "HOME" ||
                category === "LEARNING"
            ) {
                getTodosQuery = `select * from todo where category='${category}';`;
                data = await db.all(getTodosQuery);
                response.send(data.map((eachItem) => output(eachItem)));
            } else {
                response.status(400);
                response.send("Invalid Todo Category");
            }
            break;

        default:
            getTodosQuery = `select * from todo;`;
            data = await db.all(getTodosQuery);
            response.send(data.map((eachItem) => output(eachItem)));
    }

})

//API 2 - Returns a specific todo based on the todo ID

app.get("/todos/:todoId/", (request,response) =>{
    const {todoId} = request.params;
    const getTodoQuery = `select * from todo where id=${todoId};`;
    const responseResult = await db.get(getTodoQuery);
    response.send(output(responseResult))
})

//API 3 - Returns a list of all todos with a specific due date in the query parameter /agenda/?date=2021-12-12

app.get("/agenda/", async(request, response)=>{
    const {date} = request.query;
    console.log(isMatch(date, "yyyy-MM-dd"));
    if(isMatch(date, "yyyy-MM-dd")) {
        const newDate = format (new Date(date), "yyyy-MM-dd");
        const requestQuery = `SELECT * FROM todo WHERE due_date = '${newDate}'`;
        const responseResult = await db.all(requestQuery);
        response.send(responseResult.map((eachItem) => output(eachItem)));
    }else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API 4 -Create a todo in the todo table

app.post("/todos/", (request, response)=>{
    const {id, todo, status, priority, category, dueDate} = request.body
    if(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW"){
        if(status === "TO DO" || status === "IN PROGRESS" || status === "DONE"){
            if (category === "WORK" || category === "HOME" || category === "LEARNING"){
                if (isMatch(dueDate, "yyyy-MM-dd")){
                    const postNewDueDate = format(new Date(dueDate), "yyyy-MM-dd");
                    const postTodoQuery = `
                    INSERT INTO todo (id, todo, status, priority, category, dueDate)
                    VALUES (${id}, '${todo}', '${category}','${priority}', '${status}', '${postNewDueDate}');`;
                    await db.run(postTodoQuery)
                    response.send("Todo Successfully Added");
                }else{
                    response.status(400);
                    response.send("Invalid Due Date");
                }
            }else {
                response.status(400);
                response.send("Invalid Todo Category");
            }
        }else {
            response.status(400);
            response.send("Invalid Todo Status");
        }
    }else{
        response.status(400);
        response.send("Invalid Todo Priority");
    }
});

//API 5 - Updates the details of a specific todo based on the todo ID

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  console.log(requestBody);
  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  let updateTodoQuery;
  switch (true) {
    // update status
    case requestBody.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Status Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    //update priority
    case requestBody.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Priority Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    //update todo
    case requestBody.todo !== undefined:
      updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

      await db.run(updateTodoQuery);
      response.send(`Todo Updated`);
      break;

    //update category
    case requestBody.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${dueDate}' WHERE id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Category Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    //update due date
    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, "yyyy-MM-dd")) {
        const newDueDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateTodoQuery = `
    UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}', category='${category}',
     due_date='${newDueDate}' WHERE id = ${todoId};`;

        await db.run(updateTodoQuery);
        response.send(`Due Date Updated`);
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    }
});

  //API 6 - Deletes a todo from the todo table based on the todo ID

  app.delete("/todos/:todoId/", (request, response)=>{
      const { todoId } = request.params;
      const deleteTodoQuery = `
        DELETE FROM
            todo
        WHERE
            id = ${todoId};`;

        await db.run(deleteTodoQuery);
        response.send("Todo Deleted");
    });

