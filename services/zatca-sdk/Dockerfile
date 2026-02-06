FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY src/Main.java .
RUN javac Main.java

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/Main.class .
COPY ../zatca-envoice-sdk-203/Lib/Java/sdk-3.0.8-jar-with-dependencies.jar /opt/zatca/sdk.jar

ENV ZATCA_JAR_PATH=/opt/zatca/sdk.jar
ENV ZATCA_VALIDATE_CMD="java -jar /opt/zatca/sdk.jar validate {input}"

EXPOSE 8080
CMD ["java", "Main"]
