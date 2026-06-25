from analyzer import analyze_logs
from database import create_database, save_alert


create_database()


print("Starting OpenSentinel scan...\n")


result = analyze_logs()


print(result)



if result["status"] == "ALERT":


    for alert in result["alerts"]:

        save_alert(alert)


        print(
            "Alert saved to database"
        )