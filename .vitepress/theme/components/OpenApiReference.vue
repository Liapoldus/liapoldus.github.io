<script setup lang="ts">
import spec from 'virtual:management-openapi'

const methods = ['get', 'post', 'put', 'patch', 'delete'] as const
const schema = (value: unknown) => JSON.stringify(value, null, 2)
const operations = Object.entries(spec.paths ?? {}).flatMap(([path, pathItem]: [string, any]) =>
  methods.flatMap((method) => {
    const operation = pathItem?.[method]
    return operation ? [{ path, method, operation }] : []
  })
)
</script>

<template>
  <section class="openapi-reference">
    <header>
      <p class="openapi-eyebrow">OpenAPI {{ spec.openapi }}</p>
      <h2>{{ spec.info.title }}</h2>
      <p>{{ spec.info.description }}</p>
      <code>{{ spec.servers?.[0]?.url }}</code>
    </header>

    <details v-for="{ path, method, operation } in operations" :key="`${method}:${path}`" class="openapi-operation">
      <summary><span :class="['openapi-method', `openapi-method--${method}`]">{{ method.toUpperCase() }}</span><code>{{ path }}</code><span>{{ operation.summary || operation.operationId }}</span></summary>
      <div class="openapi-operation__body">
        <p v-if="operation.description">{{ operation.description }}</p>
        <h3 v-if="operation.parameters?.length">Параметры</h3>
        <table v-if="operation.parameters?.length">
          <thead><tr><th>Имя</th><th>Где</th><th>Тип</th><th>Обязателен</th></tr></thead>
          <tbody><tr v-for="parameter in operation.parameters" :key="parameter.name"><td><code>{{ parameter.name }}</code></td><td>{{ parameter.in }}</td><td><code>{{ parameter.schema?.type || 'object' }}</code></td><td>{{ parameter.required ? 'да' : 'нет' }}</td></tr></tbody>
        </table>
        <h3 v-if="operation.requestBody">Тело запроса</h3>
        <pre v-if="operation.requestBody"><code>{{ schema(operation.requestBody.content) }}</code></pre>
        <h3>Ответы</h3>
        <div v-for="(response, status) in operation.responses" :key="String(status)" class="openapi-response"><strong>{{ status }}</strong> {{ response.description }}<pre v-if="response.content"><code>{{ schema(response.content) }}</code></pre></div>
      </div>
    </details>
  </section>
</template>
